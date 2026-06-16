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

func c(_ hex: Int, _ alpha: CGFloat = 1) -> NSColor {
    NSColor(
        calibratedRed: CGFloat((hex >> 16) & 0xff) / 255,
        green: CGFloat((hex >> 8) & 0xff) / 255,
        blue: CGFloat(hex & 0xff) / 255,
        alpha: alpha
    )
}

let bg = c(0xF5F8F1)
let paper = c(0xFFFFFF)
let dark = c(0x102426)
let green = c(0x173F3F)
let mint = c(0xE7F3EE)
let softMint = c(0xF2F8F3)
let gold = c(0xF2B84B)
let goldSoft = c(0xFFF8E6)
let muted = c(0x526260)
let border = c(0xD7E6DF)
let blue = c(0x174A7C)
let blueSoft = c(0xEEF5FF)

func ease(_ value: Double) -> CGFloat {
    let t = max(0, min(1, value))
    return CGFloat(t * t * (3 - 2 * t))
}

func sceneProgress(_ t: Double, _ start: Double, _ end: Double) -> CGFloat {
    ease((t - start) / (end - start))
}

func drawRound(_ rect: CGRect, _ color: NSColor, radius: CGFloat = 24, stroke: NSColor? = nil, lineWidth: CGFloat = 1) {
    let path = NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)
    color.setFill()
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
    color: NSColor = dark,
    weight: NSFont.Weight = .regular,
    align: NSTextAlignment = .left,
    line: CGFloat = 1.08
) {
    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = align
    paragraph.lineHeightMultiple = line
    paragraph.lineBreakMode = .byWordWrapping
    let font = NSFont.systemFont(ofSize: size, weight: weight)
    let attributed = NSAttributedString(
        string: text,
        attributes: [
            .font: font,
            .foregroundColor: color,
            .paragraphStyle: paragraph,
        ]
    )
    attributed.draw(in: CGRect(x: x, y: y, width: w, height: h))
}

func drawPill(_ text: String, x: CGFloat, y: CGFloat, w: CGFloat, color: NSColor, textColor: NSColor = dark) {
    drawRound(CGRect(x: x, y: y, width: w, height: 42), color, radius: 21, stroke: border)
    drawText(text, x: x + 14, y: y + 11, w: w - 28, h: 20, size: 14, color: textColor, weight: .bold, align: .center)
}

func drawLogo(x: CGFloat, y: CGFloat, compact: Bool = false) {
    drawRound(CGRect(x: x, y: y, width: compact ? 62 : 82, height: compact ? 62 : 82), green, radius: compact ? 20 : 26)
    drawText("BMA", x: x + 8, y: y + (compact ? 20 : 27), w: compact ? 46 : 66, h: 28, size: compact ? 18 : 24, color: paper, weight: .black, align: .center)
    if !compact {
        drawText("Below Market\nApartments", x: x + 96, y: y + 10, w: 260, h: 64, size: 24, color: dark, weight: .black)
    }
}

func drawPhoneShell(x: CGFloat = 82, y: CGFloat = 214, w: CGFloat = 556, h: CGFloat = 850) {
    drawRound(CGRect(x: x, y: y, width: w, height: h), dark, radius: 58)
    drawRound(CGRect(x: x + 14, y: y + 14, width: w - 28, height: h - 28), paper, radius: 46)
    drawRound(CGRect(x: x + w / 2 - 70, y: y + 28, width: 140, height: 18), dark, radius: 9)
}

func drawAppHeader(y: CGFloat = 258) {
    drawLogo(x: 120, y: y, compact: true)
    drawText("Below Market\nApartments", x: 192, y: y + 7, w: 240, h: 52, size: 20, color: dark, weight: .black)
    drawRound(CGRect(x: 500, y: y + 12, width: 82, height: 42), mint, radius: 21)
    drawText("Deals", x: 510, y: y + 24, w: 62, h: 18, size: 14, color: green, weight: .bold, align: .center)
}

func drawPropertyCard(y: CGFloat, name: String, area: String, special: String, rent: String, selected: Bool = false) {
    drawRound(CGRect(x: 118, y: y, width: 484, height: 130), paper, radius: 24, stroke: selected ? gold : border, lineWidth: selected ? 3 : 1)
    drawRound(CGRect(x: 138, y: y + 20, width: 88, height: 88), selected ? gold : mint, radius: 18)
    drawText(selected ? "✓" : "$", x: 138, y: y + 42, w: 88, h: 38, size: 34, color: selected ? dark : green, weight: .black, align: .center)
    drawText(name, x: 244, y: y + 20, w: 280, h: 26, size: 20, color: dark, weight: .black)
    drawText(area, x: 244, y: y + 50, w: 260, h: 22, size: 15, color: muted, weight: .semibold)
    drawPill(special, x: 244, y: y + 80, w: 172, color: goldSoft, textColor: c(0x8A5B0A))
    drawText(rent, x: 472, y: y + 78, w: 100, h: 42, size: 21, color: green, weight: .black, align: .right)
}

func drawFloorPlanCard(y: CGFloat, name: String, normal: String, effective: String, savings: String, selected: Bool) {
    drawRound(CGRect(x: 118, y: y, width: 484, height: 150), paper, radius: 24, stroke: selected ? gold : border, lineWidth: selected ? 3 : 1)
    drawText(name, x: 142, y: y + 20, w: 140, h: 28, size: 24, color: dark, weight: .black)
    drawText("1 bd • 1 ba • 772 sq ft", x: 142, y: y + 54, w: 220, h: 22, size: 15, color: muted, weight: .semibold)
    drawRound(CGRect(x: 386, y: y + 18, width: 176, height: 38), selected ? goldSoft : mint, radius: 19, stroke: selected ? gold : border)
    drawText(selected ? "Added to compare" : "Compare", x: 398, y: y + 29, w: 152, h: 17, size: 13, color: selected ? c(0x8A5B0A) : green, weight: .black, align: .center)
    drawText("Normal rent", x: 142, y: y + 96, w: 110, h: 16, size: 12, color: muted, weight: .black)
    drawText(normal, x: 142, y: y + 114, w: 110, h: 24, size: 20, color: dark, weight: .black)
    drawText("After special", x: 292, y: y + 96, w: 120, h: 16, size: 12, color: muted, weight: .black)
    drawText(effective, x: 292, y: y + 114, w: 120, h: 24, size: 20, color: green, weight: .black)
    drawText("Savings", x: 440, y: y + 96, w: 90, h: 16, size: 12, color: muted, weight: .black, align: .right)
    drawText(savings, x: 438, y: y + 114, w: 96, h: 24, size: 20, color: green, weight: .black, align: .right)
}

func drawCompareTable(y: CGFloat) {
    drawRound(CGRect(x: 82, y: y, width: 556, height: 514), paper, radius: 30, stroke: border)
    drawText("Side-by-side renter value", x: 116, y: y + 28, w: 420, h: 34, size: 25, color: dark, weight: .black)
    drawPill("Properties", x: 116, y: y + 78, w: 128, color: green, textColor: paper)
    drawPill("Floor Plans", x: 256, y: y + 78, w: 138, color: softMint, textColor: green)
    drawPill("Details", x: 406, y: y + 78, w: 100, color: softMint, textColor: green)

    let columns: [(String, CGFloat, CGFloat)] = [
        ("Option", 116, 128),
        ("Normal", 258, 84),
        ("After", 356, 84),
        ("Savings", 454, 86),
    ]
    for column in columns {
        drawText(column.0, x: column.1, y: y + 144, w: column.2, h: 18, size: 13, color: muted, weight: .black)
    }

    let rows = [
        ("Dominion", "$1,359", "$1,189", "$170/mo"),
        ("Oak & Ellum", "$1,108", "$974", "$134/mo"),
        ("MAA Arts", "$1,218", "$1,015", "$203/mo"),
    ]
    for (index, row) in rows.enumerated() {
        let rowY = y + 184 + CGFloat(index) * 96
        drawRound(CGRect(x: 110, y: rowY, width: 500, height: 74), index == 0 ? mint : c(0xFAFCF8), radius: 18, stroke: border)
        drawText(row.0, x: 130, y: rowY + 18, w: 126, h: 34, size: 16, color: dark, weight: .black)
        drawText(row.1, x: 258, y: rowY + 25, w: 84, h: 24, size: 16, color: dark, weight: .bold)
        drawText(row.2, x: 356, y: rowY + 25, w: 84, h: 24, size: 16, color: green, weight: .black)
        drawText(row.3, x: 454, y: rowY + 25, w: 86, h: 24, size: 16, color: green, weight: .black)
    }

    drawRound(CGRect(x: 168, y: y + 434, width: 384, height: 52), gold, radius: 26)
    drawText("Choose what is worth touring", x: 190, y: y + 449, w: 340, h: 24, size: 18, color: dark, weight: .black, align: .center)
}

func drawPointer(x: CGFloat, y: CGFloat, scale: CGFloat = 1, click: Bool = false) {
    if click {
        drawRound(CGRect(x: x - 28, y: y - 28, width: 56, height: 56), gold.withAlphaComponent(0.35), radius: 28)
    }
    let path = NSBezierPath()
    path.move(to: CGPoint(x: x, y: y))
    path.line(to: CGPoint(x: x + 26 * scale, y: y + 72 * scale))
    path.line(to: CGPoint(x: x + 44 * scale, y: y + 48 * scale))
    path.line(to: CGPoint(x: x + 74 * scale, y: y + 96 * scale))
    path.line(to: CGPoint(x: x + 94 * scale, y: y + 84 * scale))
    path.line(to: CGPoint(x: x + 64 * scale, y: y + 38 * scale))
    path.line(to: CGPoint(x: x + 94 * scale, y: y + 34 * scale))
    path.close()
    paper.setFill()
    path.fill()
    dark.setStroke()
    path.lineWidth = 3
    path.stroke()
}

func drawCaption(_ text: String, sub: String, t: CGFloat) {
    let y = 1060 + (1 - t) * 20
    drawText(text, x: 58, y: y, w: 604, h: 96, size: 30, color: dark, weight: .black, align: .center)
    drawText(sub, x: 72, y: y + 98, w: 576, h: 70, size: 19, color: muted, weight: .semibold, align: .center)
}

func renderScene(t: Double) {
    drawRound(CGRect(x: 0, y: 0, width: CGFloat(width), height: CGFloat(height)), bg, radius: 0)
    let shimmer = CGFloat((sin(t * 1.2) + 1) / 2)
    drawRound(CGRect(x: -90, y: 80 + shimmer * 30, width: 270, height: 270), mint.withAlphaComponent(0.7), radius: 135)
    drawRound(CGRect(x: 548, y: 920 - shimmer * 20, width: 230, height: 230), goldSoft.withAlphaComponent(0.9), radius: 115)

    switch t {
    case 0..<6:
        let p = sceneProgress(t, 0, 6)
        drawLogo(x: 82, y: 96)
        drawPhoneShell(y: 274)
        drawAppHeader(y: 318)
        drawPropertyCard(y: 420, name: "Oak & Ellum", area: "East Dallas", special: "4 Weeks Free", rent: "$974", selected: false)
        drawPropertyCard(y: 570, name: "Dominion at Mercer", area: "Farmers Branch", special: "6 Weeks Free", rent: "$1,189", selected: false)
        drawPropertyCard(y: 720, name: "MAA Cathedral Arts", area: "Lower Greenville", special: "8 Weeks Free", rent: "$1,015", selected: false)
        drawCaption("Stop guessing which deal is best.", sub: "Below Market Apartments puts specials, rent, and availability in one place.", t: p)
    case 6..<13:
        let p = sceneProgress(t, 6, 13)
        drawPhoneShell(y: 220)
        drawAppHeader(y: 264)
        drawPropertyCard(y: 366, name: "Oak & Ellum", area: "East Dallas", special: "4 Weeks Free", rent: "$974", selected: p > 0.35)
        drawPropertyCard(y: 516, name: "Dominion at Mercer", area: "Farmers Branch", special: "6 Weeks Free", rent: "$1,189", selected: p > 0.6)
        drawPropertyCard(y: 666, name: "MAA Cathedral Arts", area: "Lower Greenville", special: "8 Weeks Free", rent: "$1,015", selected: false)
        let px = 500 - p * 120
        let py = 474 + p * 122
        drawPointer(x: px, y: py, scale: 0.7, click: p > 0.35 && p < 0.5 || p > 0.6 && p < 0.75)
        drawCaption("Choose properties you like.", sub: "Tap compare on the listings that match your budget and location.", t: p)
    case 13..<21:
        let p = sceneProgress(t, 13, 21)
        drawPhoneShell(y: 190)
        drawAppHeader(y: 234)
        drawText("Dominion at Mercer Crossing", x: 120, y: 324, w: 430, h: 34, size: 23, color: dark, weight: .black)
        drawPill("6 Weeks Free", x: 120, y: 372, w: 148, color: goldSoft, textColor: c(0x8A5B0A))
        drawFloorPlanCard(y: 442, name: "A1", normal: "$1,409", effective: "$1,233", savings: "$176", selected: p > 0.35)
        drawFloorPlanCard(y: 618, name: "A2", normal: "$1,554", effective: "$1,360", savings: "$194", selected: p > 0.62)
        drawPointer(x: 485 - p * 45, y: 488 + p * 150, scale: 0.65, click: p > 0.35 && p < 0.48 || p > 0.62 && p < 0.76)
        drawCaption("Then compare specific floor plans.", sub: "Normal rent, rent after special, and estimated savings stay side by side.", t: p)
    case 21..<31:
        let p = sceneProgress(t, 21, 31)
        drawCompareTable(y: 260)
        drawPointer(x: 196 + p * 212, y: 338, scale: 0.62, click: p > 0.32 && p < 0.46)
        drawCaption("Switch views without losing your picks.", sub: "Compare properties, floor plans, and details in the order renters shop.", t: p)
    case 31..<38:
        let p = sceneProgress(t, 31, 38)
        drawPhoneShell(y: 230)
        drawAppHeader(y: 274)
        drawCompareTable(y: 380)
        drawCaption("See the real renter value.", sub: "Compare specials before you tour, apply, or pay fees.", t: p)
    default:
        let p = sceneProgress(t, 38, 42)
        drawLogo(x: 116, y: 205)
        drawText("Find the best apartment deals near you.", x: 78, y: 432, w: 564, h: 120, size: 40, color: dark, weight: .black, align: .center)
        drawText("Browse. Select. Compare. Tour with confidence.", x: 86, y: 570, w: 548, h: 74, size: 24, color: muted, weight: .semibold, align: .center)
        drawRound(CGRect(x: 140, y: 706, width: 440, height: 70), gold, radius: 35)
        drawText("belowmarketapartments.com", x: 160, y: 728, w: 400, h: 28, size: 22, color: dark, weight: .black, align: .center)
        drawText("Free apartment search for renters", x: 112, y: 820, w: 496, h: 34, size: 20, color: green, weight: .black, align: .center)
        drawRound(CGRect(x: 88, y: 930, width: 544, height: 120), paper.withAlphaComponent(0.85), radius: 32, stroke: border)
        drawText("The smarter way to shop specials.", x: 122, y: 966, w: 476, h: 36, size: 28, color: dark, weight: .black, align: .center)
        _ = p
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
        AVVideoAverageBitRateKey: 3_500_000,
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
writer.finishWriting {
    writePoster(seconds: 22)
    print("Wrote \(outputURL.path)")
    print("Wrote \(posterURL.path)")
}

RunLoop.current.run(until: Date().addingTimeInterval(2))
