import app from './app';


const PORT = process.env.PORT || 3000;

// 2. Start the Server
// Binds to '0.0.0.0' to ensure the container is accessible across the Docker network bridge
const server = app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🔗 Local access: http://localhost:${PORT}`);
});

// 3. Graceful Shutdown Logic
// This prevents '502 Bad Gateway' errors during deployments by allowing in-flight requests to finish
const shutdown = (signal: string) => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

  // stop accepting new connections
  server.close(() => {
    console.log('HTTP server closed. Internal cleanup complete.');
    
    // Explicitly exit with success code
    process.exit(0);
  });

  // Force shutdown after 20s if connections are hanging (Fargate default timeout is 30s)
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 20000);
};

// Listen for termination signals from AWS ECS
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));