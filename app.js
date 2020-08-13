const express = require("express");
const spawn = require("child_process").spawn;
const { WebSocketServer } = require("@clusterws/cws");

const app = express();

app.all('*', (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By", ' 3.2.1')
    res.header("Content-Type", "application/json;charset=utf-8");
    next();
});

const server = require("http").Server(app);

server.listen(8082)

const wss = new WebSocketServer({
    noServer: true,
    path: '/video0'
}, () => {
    console.log(`Camera ${1} websocker server started`, path);
});

server.on('upgrade', (request, socket, head) => {
    console.log('upgrade')
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

let streamer;


const createStreamer = (() => {
    let streamer;
    return ({
        w = 500,
        h = 250,
        level = 0,
    }) => {
        const ffmpegOptions = [
            "-framerate", "20",
            "-video_size", `${w}x${h}`,
            "-vcodec", "libx264",
            "-i", "/dev/video0",
            "-f", "v4l2",
            "-f", "rawvideo",
        ]
        
        level === 0 && ffmpegOptions.concat(
            [
                 "-vprofile", "baseline",
                 "-b:v", "100k",
                 "-tune", "zerolatency",
                 "-preset", "ultrafast",
                 "-"
            ]
        )

        streamer = spawn("ffmpeg", ffmpegOptions);

        streamer.stderr.on("data", (data) => console.log("Streame ffmpeg stderr", data.toString()))

        streamer.on("error", () => console.log("streamer/error"));

        return {
            close() {
                streamer.kill("SIGHUP")
            }
        }
    }
})()

wss.on("connection", (socket) => {
    streamer = createStreamer()

    socket.on("close", () => {
        streamer.close()
    })
});

wss.on("error", (err) => console.error(err))


