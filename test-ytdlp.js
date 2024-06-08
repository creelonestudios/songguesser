import { YtDlp } from "@yemreak/yt-dlp"

const config = { workdir: "./downloads" }
const ytDlp = new YtDlp(config)
const url = "https://youtube.com/watch?v=dQw4w9WgXcQ"

// install
await ytDlp.downloadLatestReleaseIfNotExists()

// info
const mediaInfo = await ytDlp.retrieveMediaInfoList(url)
console.log("info:", mediaInfo)

console.time()
// download
const videoUrls = await ytDlp.downloadAudio({
	url,
	format: "ba", // best audio
})

console.log(videoUrls)
console.timeEnd()