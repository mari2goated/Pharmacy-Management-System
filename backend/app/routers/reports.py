from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_, or_, case
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional, List
import pandas as pd
import io
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

from .. import schemas, models, auth
from ..database import get_db
from ..auth import require_cashier_or_admin, require_admin, get_current_active_user

router = APIRouter()

@router.post("/sales")
async def generate_sales_report(
    report_request: schemas.SalesReportRequest,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    # Build query
    query = db.query(
        models.Sale,
        func.sum(models.Sale.grand_total).label('total_sales'),
        func.count(models.Sale.id).label('transaction_count')
    )
    
    # Apply date filter
    query = query.filter(
        and_(
            func.date(models.Sale.created_at) >= report_request.start_date,
            func.date(models.Sale.created_at) <= report_request.end_date
        )
    )
    
    # Apply cashier filter if specified
    if report_request.cashier_id:
        query = query.filter(models.Sale.cashier_id == report_request.cashier_id)
    
    # Group by based on request
    if report_request.group_by == "day":
        query = query.group_by(func.date(models.Sale.created_at))
    elif report_request.group_by == "week":
        query = query.group_by(func.strftime('%Y-%W', models.Sale.created_at))
    elif report_request.group_by == "month":
        query = query.group_by(
            extract('year', models.Sale.created_at),
            extract('month', models.Sale.created_at)
        )
    
    results = query.all()
    
    # Calculate summary
    total_revenue = db.query(func.sum(models.Sale.grand_total)).filter(
        and_(
            func.date(models.Sale.created_at) >= report_request.start_date,
            func.date(models.Sale.created_at) <= report_request.end_date
        )
    ).scalar() or Decimal('0')
    
    total_transactions = db.query(func.count(models.Sale.id)).filter(
        and_(
            func.date(models.Sale.created_at) >= report_request.start_date,
            func.date(models.Sale.created_at) <= report_request.end_date
        )
    ).scalar() or 0
    
    average_sale = total_revenue / total_transactions if total_transactions > 0 else Decimal('0')
    
    return {
        "summary": {
            "total_revenue": float(total_revenue),
            "total_transactions": total_transactions,
            "average_sale": float(average_sale),
            "date_range": {
                "start": report_request.start_date.isoformat(),
                "end": report_request.end_date.isoformat()
            }
        },
        "data": [
            {
                "period": result[0].created_at.date().isoformat() if report_request.group_by == "day" else result[0].created_at,
                "total_sales": float(result[1]),
                "transaction_count": result[2]
            }
            for result in results
        ]
    }

@router.post("/inventory")
async def generate_inventory_report(
    report_request: schemas.InventoryReportRequest,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(models.Medicine)
    
    if report_request.category_id:
        query = query.filter(models.Medicine.category_id == report_request.category_id)
    
    if report_request.low_stock_only:
        query = query.filter(
            models.Medicine.stock_quantity <= models.Medicine.reorder_level
        )
    
    if report_request.expiring_soon:
        threshold_date = date.today() + timedelta(days=90)
        query = query.filter(
            and_(
                models.Medicine.expiry_date <= threshold_date,
                models.Medicine.expiry_date >= date.today()
            )
        )
    
    medicines = query.order_by(models.Medicine.name).all()
    
    # Calculate inventory value
    total_value = sum(float(m.stock_quantity * m.unit_price) for m in medicines)
    total_cost = sum(float(m.stock_quantity * m.cost_price) for m in medicines)
    
    return {
        "summary": {
            "total_items": len(medicines),
            "total_stock_value": total_value,
            "total_cost_value": total_cost,
            "potential_profit": total_value - total_cost
        },
        "items": [
            {
                "id": m.id,
                "name": m.name,
                "medicine_id": m.medicine_id,
                "category": m.category.name if m.category else None,
                "stock_quantity": m.stock_quantity,
                "reorder_level": m.reorder_level,
                "unit_price": float(m.unit_price),
                "cost_price": float(m.cost_price),
                "stock_value": float(m.stock_quantity * m.unit_price),
                "expiry_date": m.expiry_date.isoformat() if m.expiry_date else None,
                "status": m.status.value,
                "is_low_stock": m.stock_quantity <= m.reorder_level,
                "days_to_expiry": (m.expiry_date - date.today()).days if m.expiry_date else None
            }
            for m in medicines
        ]
    }

@router.post("/financial")
async def generate_financial_report(
    report_request: schemas.FinancialReportRequest,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    # Calculate revenue
    revenue_query = db.query(
        func.sum(models.Sale.grand_total).label('total_revenue')
    ).filter(
        and_(
            func.date(models.Sale.created_at) >= report_request.start_date,
            func.date(models.Sale.created_at) <= report_request.end_date
        )
    )
    
    total_revenue = revenue_query.scalar() or Decimal('0')
    
    # Calculate COGS (Cost of Goods Sold)
    cogs = Decimal('0')
    if report_request.include_cogs:
        # This is a simplified calculation
        # In production, you might want to track exact cost of sold items
        cogs_query = db.query(
            func.sum(models.SaleItem.quantity * models.Medicine.cost_price)
        ).join(
            models.Medicine,
            models.SaleItem.medicine_id == models.Medicine.id
        ).join(
            models.Sale,
            models.SaleItem.sale_id == models.Sale.id
        ).filter(
            and_(
                func.date(models.Sale.created_at) >= report_request.start_date,
                func.date(models.Sale.created_at) <= report_request.end_date
            )
        )
        
        cogs = cogs_query.scalar() or Decimal('0')
    
    # Calculate gross profit
    gross_profit = total_revenue - cogs if report_request.include_cogs else None
    
    # Calculate other metrics
    total_transactions = db.query(func.count(models.Sale.id)).filter(
        and_(
            func.date(models.Sale.created_at) >= report_request.start_date,
            func.date(models.Sale.created_at) <= report_request.end_date
        )
    ).scalar() or 0
    
    average_transaction_value = total_revenue / total_transactions if total_transactions > 0 else Decimal('0')
    
    # Get daily revenue breakdown
    daily_revenue = db.query(
        func.date(models.Sale.created_at).label('date'),
        func.sum(models.Sale.grand_total).label('daily_revenue'),
        func.count(models.Sale.id).label('daily_transactions')
    ).filter(
        and_(
            func.date(models.Sale.created_at) >= report_request.start_date,
            func.date(models.Sale.created_at) <= report_request.end_date
        )
    ).group_by(func.date(models.Sale.created_at)).all()
    
    return {
        "period": {
            "start": report_request.start_date.isoformat(),
            "end": report_request.end_date.isoformat()
        },
        "revenue_metrics": {
            "total_revenue": float(total_revenue),
            "total_transactions": total_transactions,
            "average_transaction_value": float(average_transaction_value)
        },
        "cost_metrics": {
            "cost_of_goods_sold": float(cogs) if report_request.include_cogs else None,
            "gross_profit": float(gross_profit) if report_request.include_profit else None,
            "gross_margin": float((gross_profit / total_revenue * 100) if total_revenue > 0 else 0) 
            if report_request.include_cogs and report_request.include_profit else None
        },
        "daily_breakdown": [
            {
                "date": dr.date if isinstance(dr.date, str) else (dr.date.isoformat() if dr.date else None),
                "revenue": float(dr.daily_revenue),
                "transactions": dr.daily_transactions
            }
            for dr in daily_revenue
        ]
    }

@router.post("/export")
async def export_report(
    report_type: str = Query(...),
    format: str = Query("pdf"),
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    if report_type == "inventory":
        query = db.query(models.Medicine)
        data = [
            {
                "ID": m.id,
                "Medicine ID": m.medicine_id,
                "Name": m.name,
                "Category": m.category.name if m.category else "",
                "Stock": m.stock_quantity,
                "Reorder Level": m.reorder_level,
                "Unit Price": float(m.unit_price),
                "Cost Price": float(m.cost_price),
                "Expiry Date": m.expiry_date.isoformat() if m.expiry_date else "",
                "Status": m.status.value
            }
            for m in query.all()
        ]
    elif report_type == "sales":
        query = db.query(models.Sale)
        sales_rows = query.order_by(models.Sale.created_at.desc()).limit(1000).all()
        # Build raw data list (kept for potential excel/csv output)
        data = [
            {
                "Receipt Number": s.receipt_number,
                "Date": s.created_at.strftime('%Y-%m-%d %H:%M'),
                "Customer": f"{s.customer.first_name} {s.customer.last_name}" if s.customer else "Walk-in",
                "Cashier": s.cashier.full_name,
                "Total": float(s.total_amount),
                "Discount": float(s.discount_amount),
                "Tax": float(s.tax_amount),
                "Grand Total": float(s.grand_total),
                "Payment Method": s.payment_method.value
            }
            for s in sales_rows
        ]
    else:
        raise HTTPException(status_code=400, detail="Invalid report type")
    
    if format == "pdf":
        # Generate PDF
        output = io.BytesIO()
        doc = SimpleDocTemplate(output, pagesize=landscape(letter), topMargin=0.5*inch, bottomMargin=0.5*inch)
        
        # Styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            textColor=colors.HexColor('#1e3a8a'),
            spaceAfter=12,
            alignment=1  # Center
        )
        
        # Build PDF content
        content = []
        
        # Title
        title = Paragraph(f"{report_type.capitalize()} Report - {datetime.now().strftime('%Y-%m-%d %H:%M')}", title_style)
        content.append(title)
        content.append(Spacer(1, 0.2*inch))
        
        # Prepare table data
        if data:
            # First: detailed sales data table (all rows)
            detailed_headers = list(data[0].keys())
            detailed_table_data = [detailed_headers]
            for row in data:
                row_vals = []
                for col in detailed_headers:
                    val = row.get(col, '')
                    if col in ("Total", "Discount", "Tax", "Grand Total"):
                        try:
                            row_vals.append(f"${float(val):.2f}")
                        except Exception:
                            row_vals.append(str(val))
                    else:
                        row_vals.append(str(val))
                detailed_table_data.append(row_vals)

            detailed_table = Table(detailed_table_data, repeatRows=1)
            detailed_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a8a')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f3f4f6')]),
            ]))

            content.append(detailed_table)
            content.append(PageBreak())

            # Then: daily totals + grand total summary
            daily = {}
            grand_total = 0.0
            total_transactions = 0
            for row in data:
                date_key = str(row.get('Date', '')).split(' ')[0]
                try:
                    amount = float(row.get('Grand Total', 0) or 0)
                except Exception:
                    amount = 0.0
                daily.setdefault(date_key, {'total': 0.0, 'count': 0})
                daily[date_key]['total'] += amount
                daily[date_key]['count'] += 1
                grand_total += amount
                total_transactions += 1

            headers = ['Date', 'Total Sales', 'Transactions']
            table_data = [headers]
            for d in sorted(daily.keys()):
                table_data.append([d, f"${daily[d]['total']:.2f}", str(daily[d]['count'])])
            table_data.append(['Grand Total', f"${grand_total:.2f}", str(total_transactions)])

            summary_table = Table(table_data, repeatRows=1)
            summary_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a8a')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f3f4f6')]),
            ]))

            content.append(summary_table)
        else:
            content.append(Paragraph("No data available", styles['Normal']))
        
        # Add printed timestamp at bottom
        printed_style = ParagraphStyle('PrintedStyle', parent=styles['Normal'], fontSize=8, alignment=2)
        content.append(Spacer(1, 0.15*inch))
        content.append(Paragraph(f"Printed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", printed_style))

        # Build PDF
        doc.build(content)
        output.seek(0)
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={report_type}_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"}
        )
    
    elif format == "excel":
        df = pd.DataFrame(data)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Report', index=False)
        output.seek(0)
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={report_type}_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"}
        )
    
    else:  # csv
        df = pd.DataFrame(data)
        output = io.BytesIO()
        output.write(df.to_csv(index=False).encode())
        output.seek(0)
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={report_type}_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
        )