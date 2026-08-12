package main

import (
	"flag"
	"log"
	"net"
	"net/http"
	"os"

	"panel-agent/internal/api"
)

func main() {
	socketPath := flag.String("socket", "/run/panel-agent/agent.sock", "Unix socket path")
	flag.Parse()

	// Remove existing socket file
	os.Remove(*socketPath)

	mux := api.NewRouter()

	server := &http.Server{
		Handler: mux,
	}

	unixListener, err := net.Listen("unix", *socketPath)
	if err != nil {
		log.Fatal(err)
	}
	defer unixListener.Close()

	// Set socket permissions
	os.Chmod(*socketPath, 0660)

	log.Printf("Listening on %s", *socketPath)
	if err := server.Serve(unixListener); err != nil {
		log.Fatal(err)
	}
}
