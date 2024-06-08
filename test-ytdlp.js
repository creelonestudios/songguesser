import { YtDlp } from "@yemreak/yt-dlp"

const config = { workdir: "./downloads" }
const ytDlp = new YtDlp(config)

// install
await ytDlp.downloadLatestReleaseIfNotExists()

console.time()
// download
const videoUrls = await ytDlp.downloadAudio({
	url: "https://youtube.com/watch?v=dQw4w9WgXcQ",
	format: "ba", // best audio
})

console.log(videoUrls)
console.timeEnd()