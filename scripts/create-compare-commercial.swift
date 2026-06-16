import AppKit
import AVFoundation
import CoreGraphics

let width = 720
let height = 1280
let fps: Int32 = 24
let durationSeconds = 42.0

let outputURL = URL(fileURLWithPath: "public/marketing/bma-compare-commercial.mp4")
let posterURL = URL(fileURLWithPath: "public/marketing/bma-compare-commercial-poster.png")

try? FileManager.default.removeItem(at: outputURL)
try? FileManager.default.removeItem(at: posterURL)

func color(_ hex: Int, _ alpha: CGFloat = 1) -> NSColor {
    NSColor(
        calibratedRed: CGFloat((hex >> 16) & 0xff) / 255,
        green: CGFloat((hex >> 8) & 0xff) / 255,
        blue: CGFloat(hex & 0xff) / 255,
        alpha: alpha
    )
}

let cream = color(0xF5F8F1)
let paper = color(0xFFFFFF)
let ink = color(0x102426)
let green = color(0x173F3F)
let greenDeep = color(0x0D2B2B)
let mint = color(0xE7F3EE)
let mintSoft = color(0xF2F8F3)
let gold = color(0xF2B84B)
let goldSoft = color(0xFFF5D8)
let muted = color(0x61716E)
let border = color(0xD7E6DF)
let coral = color(0xC85B3F)
let shadow = color(0x061616, 0.18)

let photoDominion = NSImage(contentsOfFile: "public/marketing/dominion-pool.jpg")
let photoCortland = NSImage(contentsOfFile: "public/marketing/cortland-living.jpg")
let photoMaa = NSImage(contentsOfFile: "public/marketing/maa-pool.jpg")
let logoPreview = NSImage(contentsOfFile: "public/social-preview-bma.png")

func ease(_ value: Double) -> CGFloat {
    let t = max(0, min(1, value))
    return CGFloat(t * t * (3 - 2 * t))
}

func progress(_ t: Double, _ start: Double, _ end: Double) -> CGFloat {
    ease((t - start) / (end - start))
}

func drawRounded(_ rect: CGRect, _ fill: NSColor, radius: CGFloat = 24, stroke: NSColor? = nil, lineWidth: CGFloat = 1) {
    let path = NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)
    fill.setFill()
    path.fill()
    if let stroke {
        stroke.setStroke()
        path.lineWidth = lineWidth
        path.stroke()
    }
}

func drawText(
    _ text: String,
    x: CGFloat,
    y: CGFloat,
    w: CGFloat,
    h: CGFloat,
    size: CGFloat,
    fill: NSColor = ink,
    weight: NSFont.Weight = .regular,
    align: NSTextAlignment = .left,
    line: CGFloat = 1.04
) {
    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = align
    paragraph.lineBreakMode = .byWordWrapping
    paragraph.lineHeightMultiple = line
    let attributed = NSAttributedString(
        string: text,
        attributes: [
            .font: NSFont.systemFont(ofSize: size, weight: weight),
            .foregroundColor: fill,
            .paragraphStyle: paragraph,
        ]
    )
    attributed.draw(in: CGRect(x: x, y: y, width: w, height: h))
}

func drawCoverImage(_ image: NSImage?, in rect: CGRect, radius: CGFloat = 0, opacity: CGFloat = 1) {
    guard let image else {
        drawRounded(rect, mint, radius: radius)
        return
    }

    NSGraphicsContext.saveGraphicsState()
    if radius > 0 {
        NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius).addClip()
    } else {
        NSBezierPath(rect: rect).addClip()
    }

    let imageSize = image.size
    let imageRatio = imageSize.width / imageSize.height
    let rectRatio = rect.width / rect.height
    var source = CGRect(origin: .zero, size: imageSize)
    if imageRatio > rectRatio {
        let newWidth = imageSize.height * rectRatio
        source.origin.x = (imageSize.width - newWidth) / 2
        source.size.width = newWidth
    } else {
        let newHeight = imageSize.width / rectRatio
        source.origin.y = (imageSize.height - newHeight) / 2
        source.size.height = newHeight
    }
    image.draw(in: rect, from: source, operation: .sourceOver, fraction: opacity, respectFlipped: true, hints: nil)
    NSGraphicsContext.restoreGraphicsState()
}

func drawLinearOverlay(_ rect: CGRect, topAlpha: CGFloat = 0.15, bottomAlpha: CGFloat = 0.7) {
    let gradient = NSGradient(colors: [color(0x061616, topAlpha), color(0x061616, bottomAlpha)])!
    gradient.draw(in: NSBezierPath(rect: rect), angle: -90)
}

func drawShadowCard(_ rect: CGRect, fill: NSColor = paper, radius: CGFloat = 28, stroke: NSColor = border) {
    drawRounded(rect.offsetBy(dx: 0, dy: 10), shadow, radius: radius)
    drawRounded(rect, fill, radius: radius, stroke: stroke)
}

func drawLogo(x: CGFloat, y: CGFloat, size: CGFloat = 78, showName: Bool = true, light: Bool = false) {
    drawRounded(CGRect(x: x, y: y, width: size, height: size), light ? paper : green, radius: size * 0.28)
    drawText("BMA", x: x + 8, y: y + size * 0.34, w: size - 16, h: size * 0.32, size: size * 0.27, fill: light ? green : paper, weight: .black, align: .center)
    if showName {
        drawText("Below Market\nApartments", x: x + size + 14, y: y + 9, w: 270, h: 64, size: 24, fill: light ? paper : ink, weight: .black)
    }
}

func drawPill(_ text: String, x: CGFloat, y: CGFloat, w: CGFloat, h: CGFloat = 42, fill: NSColor = mint, textColor: NSColor = green, borderColor: NSColor? = border, size: CGFloat = 14) {
    drawRounded(CGRect(x: x, y: y, width: w, height: h), fill, radius: h / 2, stroke: borderColor)
    drawText(text, x: x + 12, y: y + (h - size) / 2 - 1, w: w - 24, h: size + 6, size: size, fill: textColor, weight: .black, align: .center)
}

func drawPhone(x: CGFloat = 96, y: CGFloat = 260, w: CGFloat = 528, h: CGFloat = 790, screenFill: NSColor = cream) {
    drawRounded(CGRect(x: x, y: y, width: w, height: h), greenDeep, radius: 58)
    drawRounded(CGRect(x: x + 13, y: y + 13, width: w - 26, height: h - 26), screenFill, radius: 47)
    drawRounded(CGRect(x: x + w / 2 - 64, y: y + 28, width: 128, height: 17), greenDeep, radius: 8.5)
}

func drawPhoneHeader(x: CGFloat = 132, y: CGFloat = 312) {
    drawLogo(x: x, y: y, size: 54, showName: false)
    drawText("Below Market\nApartments", x: x + 68, y: y + 2, w: 210, h: 50, size: 18, fill: ink, weight: .black)
    drawPill("Deals", x: x + 330, y: y + 7, w: 90, h: 40, fill: paper, textColor: green)
}

func drawPropertyTile(
    y: CGFloat,
    image: NSImage?,
    name: String,
    area: String,
    special: String,
    after: String,
    selected: Bool,
    lift: CGFloat = 0
) {
    let rect = CGRect(x: 130, y: y - lift, width: 460, height: 138)
    drawShadowCard(rect, fill: paper, radius: 26, stroke: selected ? gold : border)
    drawCoverImage(image, in: CGRect(x: rect.minX + 14, y: rect.minY + 14, width: 112, height: 110), radius: 20)
    if selected {
        drawRounded(CGRect(x: rect.minX + 93, y: rect.minY + 24, width: 42, height: 42), gold, radius: 21)
        drawText("✓", x: rect.minX + 93, y: rect.minY + 32, w: 42, h: 28, size: 24, fill: ink, weight: .black, align: .center)
    }
    drawText(name, x: rect.minX + 144, y: rect.minY + 14, w: 188, h: 42, size: 17, fill: ink, weight: .black)
    drawPill(selected ? "Added" : "Compare", x: rect.minX + 342, y: rect.minY + 18, w: 100, h: 34, fill: selected ? goldSoft : mint, textColor: selected ? color(0x7B5208) : green, borderColor: selected ? gold : border, size: 12)
    drawText(area, x: rect.minX + 144, y: rect.minY + 58, w: 240, h: 20, size: 14, fill: muted, weight: .semibold)
    drawPill(special, x: rect.minX + 144, y: rect.minY + 82, w: 145, h: 34, fill: goldSoft, textColor: color(0x7B5208), borderColor: color(0xF1D58A), size: 12)
    drawText("After special", x: rect.minX + 322, y: rect.minY + 78, w: 106, h: 18, size: 12, fill: muted, weight: .black, align: .right)
    drawText(after, x: rect.minX + 315, y: rect.minY + 96, w: 112, h: 28, size: 23, fill: green, weight: .black, align: .right)
}

func drawFloorPlanTile(y: CGFloat, name: String, detail: String, normal: String, after: String, savings: String, selected: Bool) {
    let rect = CGRect(x: 128, y: y, width: 464, height: 146)
    drawShadowCard(rect, fill: paper, radius: 25, stroke: selected ? gold : border)
    drawText(name, x: rect.minX + 22, y: rect.minY + 18, w: 90, h: 34, size: 26, fill: ink, weight: .black)
    drawText(detail, x: rect.minX + 22, y: rect.minY + 54, w: 210, h: 22, size: 14, fill: muted, weight: .semibold)
    drawPill(selected ? "Selected" : "Compare", x: rect.minX + 312, y: rect.minY + 20, w: 126, h: 36, fill: selected ? goldSoft : mint, textColor: selected ? color(0x7B5208) : green, borderColor: selected ? gold : border, size: 13)
    drawText("Normal", x: rect.minX + 24, y: rect.minY + 94, w: 86, h: 16, size: 12, fill: muted, weight: .black)
    drawText(normal, x: rect.minX + 24, y: rect.minY + 112, w: 86, h: 24, size: 19, fill: ink, weight: .black)
    drawText("After special", x: rect.minX + 162, y: rect.minY + 94, w: 120, h: 16, size: 12, fill: muted, weight: .black)
    drawText(after, x: rect.minX + 162, y: rect.minY + 112, w: 120, h: 24, size: 19, fill: green, weight: .black)
    drawText("Saves", x: rect.minX + 330, y: rect.minY + 94, w: 86, h: 16, size: 12, fill: muted, weight: .black, align: .right)
    drawText(savings, x: rect.minX + 318, y: rect.minY + 112, w: 100, h: 24, size: 19, fill: green, weight: .black, align: .right)
}

func drawTapPulse(x: CGFloat, y: CGFloat, p: CGFloat, start: CGFloat, end: CGFloat, label: String = "Added") {
    guard p >= start && p <= end else { return }
    let q = ease(Double((p - start) / (end - start)))
    let ringRadius = 24 + q * 42
    let ringAlpha = max(0, 0.42 * (1 - q))

    let ringPath = NSBezierPath(ovalIn: CGRect(x: x - ringRadius, y: y - ringRadius, width: ringRadius * 2, height: ringRadius * 2))
    gold.withAlphaComponent(ringAlpha).setFill()
    ringPath.fill()

    drawRounded(CGRect(x: x - 19, y: y - 19, width: 38, height: 38), gold.withAlphaComponent(0.86), radius: 19)
    drawRounded(CGRect(x: x - 7, y: y - 7, width: 14, height: 14), paper.withAlphaComponent(0.95), radius: 7)

    _ = label
}

func drawTitle(_ title: String, subtitle: String, y: CGFloat = 96, light: Bool = false) {
    drawText(title, x: 56, y: y, w: 608, h: 126, size: 42, fill: light ? paper : ink, weight: .black, align: .center, line: 0.98)
    drawText(subtitle, x: 74, y: y + 138, w: 572, h: 66, size: 20, fill: light ? paper.withAlphaComponent(0.86) : muted, weight: .semibold, align: .center)
}

func drawHeroScene(_ p: CGFloat) {
    drawCoverImage(photoDominion, in: CGRect(x: 0, y: 0, width: width, height: height), radius: 0)
    drawLinearOverlay(CGRect(x: 0, y: 0, width: width, height: height), topAlpha: 0.25, bottomAlpha: 0.88)
    drawLogo(x: 58, y: 66, size: 70, showName: true, light: true)
    drawText("Find the best apartment deals near you.", x: 54, y: 735 - p * 18, w: 612, h: 170, size: 54, fill: paper, weight: .black, align: .left, line: 0.96)
    drawText("Choose properties. Compare floor plans. See the real savings before you tour.", x: 58, y: 914, w: 560, h: 92, size: 24, fill: paper.withAlphaComponent(0.9), weight: .semibold, line: 1.1)
    drawRounded(CGRect(x: 58, y: 1044, width: 322, height: 58), gold, radius: 29)
    drawText("Free for renters", x: 84, y: 1061, w: 270, h: 26, size: 20, fill: ink, weight: .black, align: .center)
    drawText("belowmarketapartments.com", x: 58, y: 1128, w: 440, h: 30, size: 21, fill: paper, weight: .black)
}

func drawSearchScene(_ p: CGFloat) {
    drawRounded(CGRect(x: 0, y: 0, width: width, height: height), cream, radius: 0)
    drawCoverImage(photoCortland, in: CGRect(x: 0, y: 0, width: width, height: 410), radius: 0)
    drawLinearOverlay(CGRect(x: 0, y: 0, width: width, height: 410), topAlpha: 0.04, bottomAlpha: 0.72)
    drawLogo(x: 58, y: 56, size: 58, showName: true, light: true)
    drawText("Tap Compare on your favorites.", x: 58, y: 286, w: 570, h: 70, size: 35, fill: paper, weight: .black)
    drawPhone(y: 378, h: 772)
    drawPhoneHeader(y: 430)
    drawPill("Properties", x: 132, y: 512, w: 128, h: 38, fill: green, textColor: paper, borderColor: green)
    drawPill("Floor Plans", x: 274, y: 512, w: 132, h: 38, fill: paper, textColor: green)
    drawPill("Details", x: 420, y: 512, w: 96, h: 38, fill: paper, textColor: green)
    drawPropertyTile(y: 586, image: photoDominion, name: "Dominion", area: "Farmers Branch", special: "6 Weeks Free", after: "$1,189", selected: p > 0.2, lift: p > 0.2 ? 5 : 0)
    drawPropertyTile(y: 744, image: photoMaa, name: "MAA Cathedral Arts", area: "Lower Greenville", special: "8 Weeks Free", after: "$1,015", selected: p > 0.43, lift: p > 0.43 ? 5 : 0)
    drawPropertyTile(y: 902, image: photoCortland, name: "Cortland on McKinney", area: "Uptown Dallas", special: "Move-in deal", after: "$1,355", selected: false)
    drawTapPulse(x: 522, y: 621, p: p, start: 0.16, end: 0.31)
    drawTapPulse(x: 522, y: 779, p: p, start: 0.39, end: 0.54)
}

func drawFloorPlanScene(_ p: CGFloat) {
    drawRounded(CGRect(x: 0, y: 0, width: width, height: height), cream, radius: 0)
    drawTitle("Choose exact floor plans.", subtitle: "Compare the layouts that actually match your budget.", y: 64)
    drawPhone(y: 286, h: 810)
    drawPhoneHeader(y: 338)
    drawCoverImage(photoDominion, in: CGRect(x: 130, y: 420, width: 460, height: 128), radius: 24)
    drawLinearOverlay(CGRect(x: 130, y: 420, width: 460, height: 128), topAlpha: 0.02, bottomAlpha: 0.62)
    drawText("Dominion at Mercer Crossing", x: 154, y: 476, w: 342, h: 30, size: 22, fill: paper, weight: .black)
    drawPill("6 Weeks Free", x: 154, y: 510, w: 138, h: 34, fill: gold, textColor: ink, borderColor: nil, size: 13)
    drawFloorPlanTile(y: 584, name: "A1", detail: "1 bd • 1 ba • 758 sq ft", normal: "$1,409", after: "$1,233", savings: "$176", selected: p > 0.2)
    drawFloorPlanTile(y: 750, name: "A2", detail: "1 bd • 1 ba • 812 sq ft", normal: "$1,554", after: "$1,360", savings: "$194", selected: p > 0.43)
    drawPill("\(p > 0.43 ? 2 : p > 0.2 ? 1 : 0) selected to compare", x: 174, y: 940, w: 372, h: 54, fill: green, textColor: paper, borderColor: nil, size: 18)
    drawTapPulse(x: 502, y: 622, p: p, start: 0.19, end: 0.34, label: "Selected")
    drawTapPulse(x: 502, y: 788, p: p, start: 0.43, end: 0.58, label: "Selected")
}

func drawCompareCard(x: CGFloat, y: CGFloat, w: CGFloat, title: String, image: NSImage?, badge: String, normal: String, after: String, savings: String, highlight: Bool = false) {
    let rect = CGRect(x: x, y: y, width: w, height: 396)
    drawShadowCard(rect, fill: highlight ? mintSoft : paper, radius: 26, stroke: highlight ? gold : border)
    drawCoverImage(image, in: CGRect(x: x + 16, y: y + 16, width: w - 32, height: 126), radius: 20)
    drawPill(badge, x: x + 28, y: y + 104, w: 136, h: 34, fill: gold, textColor: ink, borderColor: nil, size: 12)
    drawText(title, x: x + 20, y: y + 162, w: w - 40, h: 48, size: 20, fill: ink, weight: .black)
    drawText("Normal", x: x + 24, y: y + 228, w: 90, h: 18, size: 12, fill: muted, weight: .black)
    drawText(normal, x: x + 24, y: y + 248, w: 110, h: 28, size: 21, fill: ink, weight: .black)
    drawText("After special", x: x + 24, y: y + 292, w: 125, h: 18, size: 12, fill: muted, weight: .black)
    drawText(after, x: x + 24, y: y + 312, w: 130, h: 32, size: 26, fill: green, weight: .black)
    drawRounded(CGRect(x: x + w - 132, y: y + 286, width: 108, height: 62), highlight ? gold : mint, radius: 18)
    drawText(savings, x: x + w - 126, y: y + 302, w: 96, h: 24, size: 19, fill: highlight ? ink : green, weight: .black, align: .center)
    drawText("savings", x: x + w - 126, y: y + 326, w: 96, h: 16, size: 11, fill: highlight ? ink : green, weight: .bold, align: .center)
}

func drawCompareScene(_ p: CGFloat) {
    drawRounded(CGRect(x: 0, y: 0, width: width, height: height), cream, radius: 0)
    drawLogo(x: 58, y: 54, size: 58, showName: true)
    drawTitle("Compare before you tour.", subtitle: "Properties first. Floor plans next. Details when you need them.", y: 150)
    drawPill("Properties", x: 86, y: 324, w: 158, h: 48, fill: green, textColor: paper, borderColor: green, size: 16)
    drawPill("Floor Plans", x: 264, y: 324, w: 166, h: 48, fill: paper, textColor: green, size: 16)
    drawPill("Details", x: 450, y: 324, w: 118, h: 48, fill: paper, textColor: green, size: 16)
    drawCompareCard(x: 54 - (1 - p) * 36, y: 420, w: 286, title: "Dominion", image: photoDominion, badge: "6 Weeks Free", normal: "$1,359", after: "$1,189", savings: "$170/mo", highlight: true)
    drawCompareCard(x: 380 + (1 - p) * 36, y: 420, w: 286, title: "MAA Cathedral Arts", image: photoMaa, badge: "8 Weeks Free", normal: "$1,218", after: "$1,015", savings: "$203/mo")
    drawShadowCard(CGRect(x: 72, y: 870, width: 576, height: 142), fill: greenDeep, radius: 30, stroke: greenDeep)
    drawText("See the deal, rent, savings, and next step side by side.", x: 106, y: 900, w: 508, h: 78, size: 28, fill: paper, weight: .black, align: .center)
    drawPill("No more guessing", x: 226, y: 1002, w: 268, h: 48, fill: gold, textColor: ink, borderColor: nil, size: 17)
}

func drawDecisionScene(_ p: CGFloat) {
    drawCoverImage(photoMaa, in: CGRect(x: 0, y: 0, width: width, height: height), radius: 0)
    drawLinearOverlay(CGRect(x: 0, y: 0, width: width, height: height), topAlpha: 0.12, bottomAlpha: 0.78)
    drawLogo(x: 58, y: 58, size: 62, showName: true, light: true)
    drawText("Tour the deal that makes sense.", x: 54, y: 658 - p * 14, w: 600, h: 138, size: 52, fill: paper, weight: .black, line: 0.98)
    let checks = [
        ("Compare selected properties", "Side by side"),
        ("Pick exact floor plans", "Not just averages"),
        ("Know what to confirm", "Fees, terms, availability"),
    ]
    for (index, item) in checks.enumerated() {
        let rowY = 846 + CGFloat(index) * 92
        drawRounded(CGRect(x: 62, y: rowY, width: 596, height: 70), paper.withAlphaComponent(0.92), radius: 22)
        drawRounded(CGRect(x: 84, y: rowY + 16, width: 38, height: 38), gold, radius: 19)
        drawText("✓", x: 84, y: rowY + 22, w: 38, h: 24, size: 22, fill: ink, weight: .black, align: .center)
        drawText(item.0, x: 142, y: rowY + 15, w: 330, h: 22, size: 18, fill: ink, weight: .black)
        drawText(item.1, x: 142, y: rowY + 40, w: 330, h: 20, size: 14, fill: muted, weight: .semibold)
    }
}

func drawEndScene(_ p: CGFloat) {
    drawRounded(CGRect(x: 0, y: 0, width: width, height: height), greenDeep, radius: 0)
    drawCoverImage(photoDominion, in: CGRect(x: 0, y: 0, width: width, height: 560), radius: 0, opacity: 0.48)
    drawLinearOverlay(CGRect(x: 0, y: 0, width: width, height: 560), topAlpha: 0.12, bottomAlpha: 0.84)
    drawLogo(x: 116, y: 170, size: 92, showName: true, light: true)
    drawText("Below Market Apartments", x: 62, y: 560, w: 596, h: 64, size: 40, fill: paper, weight: .black, align: .center)
    drawText("Find the best apartment deals near you.", x: 80, y: 642, w: 560, h: 92, size: 32, fill: paper.withAlphaComponent(0.9), weight: .semibold, align: .center)
    drawRounded(CGRect(x: 92, y: 800, width: 536, height: 82), gold, radius: 41)
    drawText("Browse. Select. Compare.", x: 120, y: 824, w: 480, h: 34, size: 28, fill: ink, weight: .black, align: .center)
    drawText("belowmarketapartments.com", x: 84, y: 940, w: 552, h: 42, size: 30, fill: paper, weight: .black, align: .center)
    drawText("Free apartment search for renters", x: 100, y: 1000, w: 520, h: 32, size: 20, fill: gold, weight: .black, align: .center)
    _ = p
}

func renderScene(t: Double) {
    switch t {
    case 0..<6:
        drawHeroScene(progress(t, 0, 6))
    case 6..<14:
        drawSearchScene(progress(t, 6, 14))
    case 14..<22:
        drawFloorPlanScene(progress(t, 14, 22))
    case 22..<32:
        drawCompareScene(progress(t, 22, 32))
    case 32..<38:
        drawDecisionScene(progress(t, 32, 38))
    default:
        drawEndScene(progress(t, 38, 42))
    }
}

func renderIntoContext(_ context: CGContext, seconds: Double) {
    context.saveGState()
    context.translateBy(x: 0, y: CGFloat(height))
    context.scaleBy(x: 1, y: -1)
    NSGraphicsContext.saveGraphicsState()
    let graphicsContext = NSGraphicsContext(cgContext: context, flipped: true)
    NSGraphicsContext.current = graphicsContext
    renderScene(t: seconds)
    NSGraphicsContext.restoreGraphicsState()
    context.restoreGState()
}

func makePixelBuffer(seconds: Double) -> CVPixelBuffer {
    var pixelBuffer: CVPixelBuffer?
    let attributes: [CFString: Any] = [
        kCVPixelBufferCGImageCompatibilityKey: true,
        kCVPixelBufferCGBitmapContextCompatibilityKey: true,
        kCVPixelBufferPixelFormatTypeKey: kCVPixelFormatType_32ARGB,
        kCVPixelBufferWidthKey: width,
        kCVPixelBufferHeightKey: height,
    ]
    CVPixelBufferCreate(kCFAllocatorDefault, width, height, kCVPixelFormatType_32ARGB, attributes as CFDictionary, &pixelBuffer)
    guard let buffer = pixelBuffer else {
        fatalError("Could not create pixel buffer")
    }
    CVPixelBufferLockBaseAddress(buffer, [])
    defer { CVPixelBufferUnlockBaseAddress(buffer, []) }

    guard let context = CGContext(
        data: CVPixelBufferGetBaseAddress(buffer),
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue
    ) else {
        fatalError("Could not create CGContext")
    }
    renderIntoContext(context, seconds: seconds)
    return buffer
}

func writePoster(seconds: Double) {
    guard let context = CGContext(
        data: nil,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: 0,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else {
        return
    }
    renderIntoContext(context, seconds: seconds)
    guard let image = context.makeImage() else { return }
    let rep = NSBitmapImageRep(cgImage: image)
    guard let png = rep.representation(using: .png, properties: [:]) else { return }
    try? png.write(to: posterURL)
}

let writer = try AVAssetWriter(outputURL: outputURL, fileType: .mp4)
let settings: [String: Any] = [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: width,
    AVVideoHeightKey: height,
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: 4_800_000,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
    ],
]
let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(
    assetWriterInput: input,
    sourcePixelBufferAttributes: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB,
        kCVPixelBufferWidthKey as String: width,
        kCVPixelBufferHeightKey as String: height,
    ]
)

guard writer.canAdd(input) else {
    fatalError("Cannot add writer input")
}
writer.add(input)

writer.startWriting()
writer.startSession(atSourceTime: .zero)

let totalFrames = Int(durationSeconds * Double(fps))
for frame in 0..<totalFrames {
    while !input.isReadyForMoreMediaData {
        usleep(1_000)
    }
    let seconds = Double(frame) / Double(fps)
    let buffer = makePixelBuffer(seconds: seconds)
    let time = CMTime(value: CMTimeValue(frame), timescale: fps)
    if !adaptor.append(buffer, withPresentationTime: time) {
        fatalError("Failed to append frame \(frame): \(writer.error?.localizedDescription ?? "unknown error")")
    }
}

input.markAsFinished()
let semaphore = DispatchSemaphore(value: 0)
writer.finishWriting {
    writePoster(seconds: 24)
    print("Wrote \(outputURL.path)")
    print("Wrote \(posterURL.path)")
    semaphore.signal()
}
_ = semaphore.wait(timeout: .now() + 10)
