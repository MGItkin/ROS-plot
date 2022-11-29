# Build server
FROM golang:1.13.6-stretch AS server-builder

ENV CGO_ENABLED=0 \
  GOOS=linux \
  GOARCH=amd64

WORKDIR /build

# Let's cache modules retrieval - those don't change so often
# COPY go.mod .
# COPY go.sum .
# RUN go mod download

ADD ./server/src .
RUN go build -o ros-plot-server .

# Build web app
FROM node:13.6.0-alpine as ui-builder
WORKDIR /ui
ENV PATH /ui/node_modules/.bin:$PATH
ADD ./ui .
RUN yarn install
RUN yarn run build

# Create the minimal runtime image
FROM scratch
COPY --from=server-builder /build /
COPY --from=ui-builder /ui/build /app

# Set up the app to run as a non-root user inside the /data folder
# User ID 65534 is usually user 'nobody'. 
# The executor of this image should still specify a user during setup.

USER 65534
# WORKDIR /dist
EXPOSE 8080
CMD ["/ros-plot-server"]