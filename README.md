# ROS Plot

This project provides a application to visualize data from the Ceres project from a Ros Bridge or local .bag file import.

### Project File Structure

```
ui/       # React Web Application

server/   # GO Backend API
```

#### Server Config & Data Directories

All server config files and Data folders should be in the _Current Working Directory_ when executing the server

- ROS topic ignore: `data/ros_topic_ignore.txt` is a list of `\n` separated topic names. Using the `*` glob operator is supported
- ROS Plot JSON dashboards: `data/` the API will use this folder to store all user created dashboards. Dashboards that have been deleted using the API will be prefixed with `deleted_`.
- Static wep app files: `app/` directory of application files that will be served to the client at the path: `/`

Sample `data/ros_topic_ignore.txt`:

```
/camera/*
/cameras/*
```

## CV-PC Deployment

_data directory:_ /var/lib/ros-plot/data

#### Container Spawned with:

```
docker run -d --name ros-plot \
--restart always \
-p 5000:5000 \
--mount type=bind,source=/var/lib/ros-plot/data,target=/data \
DOCKER_HOST/ros-plot:latest
```

#### Docker Help Commands

Check if the `ros-plot` container is running & view it's logs

```
docker container ps
docker logs ros-plot
```

**Note:** The container will auto restart when the machine is rebooted or if the ros-plot process faults.

Update the ROS Plot image

```
docker pull DOCKER_HOST/ros-plot:latest
docker stop ros-plot
docker rm ros-plot

Re-spawn the container using the above docker run command
```

## Build & Run ROS Plot **without** Docker

This uses the pre-made binary in ./server/release tracked in git-lfs

_prerequisite:_ setup Git LFS see:
https://github.com/git-lfs/git-lfs/wiki/Installation

If LFS was not installed prior to cloning the repo you may have to run:
`git lfs fetch --all`

```
./docker-free-buildit.sh
cd server
./release/ros-plot-server
```

## Build & Run ROS Plot **with** Docker

Docker v19+

#### Build Image

Multistage docker image build pulls source files into intermediate containers before creating a final docker image with production binaries and web-app

```
./buildit.sh
```

this image is tagged as `ros-plot-server:latest` and will require a volume of type `bind` to `/data`

#### Run Image

use the included docker-compose file by running:

```
docker-compose up
```

_Note: you can edit the local dashboard files directory by changing the line: `source: ./server/data` in `./docker-compose.yml`_

Alternatively, run from the command line with:

```
docker run \
-it \
-p 80:8080 \
--mount type=bind,source="$(pwd)"/server/data,target=/data  \
ros-plot-server:latest
```

## UI (without Docker)

Node v13.6.0
Yarn

#### Production

```
cd ui/
yarn install
yarn run build
serve ./build
```

#### Development

```
cd ui/
yarn install
yarn start
```

## Server (without Docker)

Golang v1.13.6

```
cd server
./buildit.sh
mkdir data
./build/ros-plot-server
```
