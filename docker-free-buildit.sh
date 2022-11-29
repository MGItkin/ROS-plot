#!/bin/bash

echo "pulling from Git LFS"
git lfs pull

echo "cleaning previous builds"
(rm -rf server/app) || exit 1

echo "building ROS Plot UI"
(cd ui; yarn install; yarn run build;) || exit 1

echo "moving built files to ./app"
mv ui/build server/app || exit 1

echo "checking folder dependancy ./server/data"
mkdir -p ./server/data || exit 1

echo "Complete!"
echo "cd ./server and run .release/ros-plot-server to start ROS Plot"
echo "then connect to http://THIS_MACHINE_IP:5000/"

