#!/bin/bash

GIT_SHORT=$(git rev-parse --short HEAD)
IMAGE_TAG="ros-plot:$GIT_SHORT"

echo "building ROS Plot and tagging as: $IMAGE_TAG"
docker build -t "$IMAGE_TAG" . || exit 1
