process.env.NODE_ENV = "production";
const { startServer } = await import("./index.js");
startServer();
