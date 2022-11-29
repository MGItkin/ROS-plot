#!/bin/bash

# Build go executable
echo "Cleaning previous build runs"
rm -rf build
mkdir build

echo "Building execuable"
(cd src; GOOS=linux GOARCH=amd64 go build -o ../build/ros-plot-server) || exit 1

echo "Complete!"
