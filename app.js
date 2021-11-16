const { app, BrowserWindow } = require("electron");
var fs = require("fs");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config({ path: "./config/config.env" });

connectDB();

if (process.platform === "win32") {
  app.name = "KC Screen Monitoring";
  app.setAppUserModelId(app.name);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 360,
    height: 600,
    icon: "assets/images/icon.png",
    autoHideMenuBar: true,
    titleBarStyle: "hiddenInset",
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
    },
  });

  console.log(app.getPath("userData"));
  const dir = app.getPath("userData") + "/assets/images/captured/";
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {
      recursive: true,
    });
  }
  win.loadFile("index.html");
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
