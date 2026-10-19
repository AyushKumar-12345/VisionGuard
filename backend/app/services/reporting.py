from pathlib import Path
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def generate_traffic_pdf(report_data: dict[str, Any], output_path: Path) -> Path:
    """
    Generates a structured, publication-grade Traffic Intelligence PDF report.
    """
    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0f172a")
    )
    subtitle_style = ParagraphStyle(
        "SubTitle",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#64748b")
    )
    h2_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontSize=13,
        leading=17,
        textColor=colors.HexColor("#1e293b"),
        spaceBefore=14,
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155")
    )

    story = []

    # Title & Subtitle
    story.append(Paragraph("VisionGuard — Traffic Intelligence Report", title_style))
    story.append(Paragraph(f"Analysis Job ID: {report_data.get('job_id', 'N/A')} | Generated: {report_data.get('generated_at', 'N/A')}", subtitle_style))
    story.append(Spacer(1, 14))

    # Video Metadata Section
    story.append(Paragraph("1. Ingested Video & Runtime Metadata", h2_style))
    v_data = report_data.get("video", {})
    video_table_data = [
        ["Original Filename", v_data.get("filename", "N/A"), "Resolution", f"{v_data.get('width', 0)} x {v_data.get('height', 0)}"],
        ["Duration (s)", f"{v_data.get('duration_seconds', 0.0):.1f} s", "Frame Rate", f"{v_data.get('fps', 0.0):.1f} FPS"],
        ["Total Frames", str(v_data.get("total_frames", 0)), "Processing Speed", f"{report_data.get('processing_fps', 0.0):.1f} FPS"],
        ["Model Name", report_data.get("model_name", "N/A"), "Confidence Thresh", str(report_data.get("conf_threshold", 0.35))]
    ]
    t1 = Table(video_table_data, colWidths=[130, 135, 130, 135])
    t1.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#0f172a")),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("PADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(t1)
    story.append(Spacer(1, 12))

    # Traffic Summary Section
    story.append(Paragraph("2. Traffic Volume & Separation of Metrics", h2_style))
    det_sum = report_data.get("detection_summary", {})
    track_sum = report_data.get("tracking_summary", {})

    metrics_table_data = [
        ["Metric Category", "Count", "Technical Definition"],
        ["Raw Detections", str(det_sum.get("total_detections", 0)), "Total vehicle bounding boxes across all processed frames."],
        ["Unique Tracked Vehicles", str(track_sum.get("total_unique_tracks", 0)), "Distinct vehicle tracks confirmed across multiple frames."],
        ["Virtual Line Crossings", str(track_sum.get("total_line_crossings", 0)), "Vehicles intersecting the virtual counting line."]
    ]
    t2 = Table(metrics_table_data, colWidths=[140, 70, 320])
    t2.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("PADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(t2)
    story.append(Spacer(1, 12))

    # Class Breakdown Section
    story.append(Paragraph("3. Vehicle Class Breakdown", h2_style))
    tracks_by_class = track_sum.get("tracks_by_class", {})
    class_table_data = [["Vehicle Class", "Unique Vehicles Tracked", "Line Crossings"]]
    for cls, count in tracks_by_class.items():
        cross_count = track_sum.get("crossings_by_class", {}).get(cls, 0)
        class_table_data.append([cls.capitalize(), str(count), str(cross_count)])

    t3 = Table(class_table_data, colWidths=[180, 175, 175])
    t3.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#334155")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("PADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(t3)
    story.append(Spacer(1, 14))

    # Directional Flow Breakdown
    story.append(Paragraph("4. Directional Traffic Flow", h2_style))
    cross_dir = track_sum.get("crossings_by_direction", {})
    dir_table_data = [["Direction", "Count"]]
    for direction, count in cross_dir.items():
        dir_table_data.append([direction, str(count)])
    t4 = Table(dir_table_data, colWidths=[265, 265])
    t4.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("PADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(t4)
    story.append(Spacer(1, 14))

    # Methodological Disclaimer
    story.append(Paragraph("5. Technical Limitations & Camera Calibration Disclaimers", h2_style))
    disclaimer_text = (
        "<b>Important Notice:</b> This report reflects monocular video surveillance analytics using ByteTrack and YOLO object detection. "
        "Vehicle speeds are not estimated because real-world metric conversion requires 4-point homography calibration and physical ground markers. "
        "Track IDs represent transient scene trajectories and must not be construed as permanent vehicle identities or biometric identification."
    )
    story.append(Paragraph(disclaimer_text, body_style))

    doc.build(story)
    return output_path
