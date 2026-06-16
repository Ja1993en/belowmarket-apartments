import AppKit
import AVFoundation

let projectRoot = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let videoURL = projectRoot.appendingPathComponent("public/marketing/bma-compare-commercial.mp4")
let narrationURL = URL(fileURLWithPath: "/tmp/bma-compare-commercial-narration.aiff")
let outputURL = URL(fileURLWithPath: "/tmp/bma-compare-commercial-with-narration.mp4")

let narration = """
Looking for an apartment deal?

With Below Market Apartments, you can browse current specials near you.

Tap Compare on the properties you like.

Then choose the exact floor plans that fit your budget.

See the normal rent, the estimated rent after the special, and your monthly savings side by side.

Compare properties first, floor plans next, and details when you need them.

Then tour with confidence, knowing which deal is actually worth it.

Below Market Apartments. Find the best apartment deals near you.
"""

func availableVoiceRawValues() -> Set<String> {
    Set(NSSpeechSynthesizer.availableVoices.map(\.rawValue))
}

func generateNarration() {
    let availableVoices = availableVoiceRawValues()
    let preferredVoices = [
        "com.apple.speech.synthesis.voice.Alex",
        "com.apple.speech.synthesis.voice.samantha",
        "com.apple.speech.synthesis.voice.Victoria",
    ]
    guard
        let voiceId = preferredVoices.first(where: { availableVoices.contains($0) }),
        let synthesizer = NSSpeechSynthesizer(voice: NSSpeechSynthesizer.VoiceName(rawValue: voiceId))
    else {
        fatalError("Could not load an English narrator voice.")
    }

    synthesizer.rate = voiceId.contains("Alex") ? 154 : 162
    try? FileManager.default.removeItem(at: narrationURL)
    guard synthesizer.startSpeaking(narration, to: narrationURL) else {
        fatalError("Could not generate narration.")
    }
    while synthesizer.isSpeaking {
        RunLoop.current.run(until: Date().addingTimeInterval(0.1))
    }
    print("Generated narration with \(voiceId)")
}

func seconds(_ value: Double) -> CMTime {
    CMTime(seconds: value, preferredTimescale: 600)
}

func addNarrationToVideo() {
    try? FileManager.default.removeItem(at: outputURL)

    let videoAsset = AVURLAsset(url: videoURL)
    let audioAsset = AVURLAsset(url: narrationURL)
    let composition = AVMutableComposition()

    guard
        let sourceVideoTrack = videoAsset.tracks(withMediaType: .video).first,
        let compositionVideoTrack = composition.addMutableTrack(
            withMediaType: .video,
            preferredTrackID: kCMPersistentTrackID_Invalid
        )
    else {
        fatalError("Could not read the video track.")
    }

    do {
        try compositionVideoTrack.insertTimeRange(
            CMTimeRange(start: .zero, duration: videoAsset.duration),
            of: sourceVideoTrack,
            at: .zero
        )
        compositionVideoTrack.preferredTransform = sourceVideoTrack.preferredTransform
    } catch {
        fatalError("Could not insert video track: \(error.localizedDescription)")
    }

    if
        let sourceAudioTrack = audioAsset.tracks(withMediaType: .audio).first,
        let compositionAudioTrack = composition.addMutableTrack(
            withMediaType: .audio,
            preferredTrackID: kCMPersistentTrackID_Invalid
        )
    {
        let startTime = seconds(0.65)
        let maxNarrationDuration = CMTimeSubtract(videoAsset.duration, startTime)
        let narrationDuration = CMTimeMinimum(audioAsset.duration, maxNarrationDuration)
        do {
            try compositionAudioTrack.insertTimeRange(
                CMTimeRange(start: .zero, duration: narrationDuration),
                of: sourceAudioTrack,
                at: startTime
            )
        } catch {
            fatalError("Could not insert narration track: \(error.localizedDescription)")
        }
    } else {
        fatalError("Could not read generated narration audio.")
    }

    guard let exporter = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) else {
        fatalError("Could not create video exporter.")
    }
    exporter.outputURL = outputURL
    exporter.outputFileType = .mp4
    exporter.shouldOptimizeForNetworkUse = true

    let semaphore = DispatchSemaphore(value: 0)
    exporter.exportAsynchronously {
        semaphore.signal()
    }
    _ = semaphore.wait(timeout: .now() + 120)

    if exporter.status != .completed {
        fatalError("Could not export narrated video: \(exporter.error?.localizedDescription ?? "unknown error")")
    }

    do {
        try FileManager.default.removeItem(at: videoURL)
        try FileManager.default.moveItem(at: outputURL, to: videoURL)
        print("Wrote narrated video to \(videoURL.path)")
    } catch {
        fatalError("Could not replace video: \(error.localizedDescription)")
    }
}

generateNarration()
addNarrationToVideo()
