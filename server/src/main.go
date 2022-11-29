package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"regexp"
	"strings"
)

const dataDir = "./data"
const appDir = "./app"
const rosIgnoreListPath = "./data/ros_ignore_list.txt"

var validPath = regexp.MustCompile(`^/v0/(dashboard)/([a-zA-Z0-9_\-\ ]*)$`)
var envJSON = []byte("{}")

// RemovedPrefix for files that have been deleted by the user
const RemovedPrefix = "deleted_"

func getDashboardPath(name string) string {
	fileName := name
	if strings.HasSuffix(fileName, ".json") == false {
		fileName = fileName + ".json"
	}
	return fmt.Sprintf("%s/%s", dataDir, fileName)
}

// wrap http handlers to add path checking and CORS
func makeHandler(fn func(http.ResponseWriter, *http.Request, string)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Headers for CORS checks
		w.Header().Set("Access-Control-Allow-Methods", "DELETE, POST, GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		m := validPath.FindStringSubmatch(r.URL.Path)
		if m == nil {
			http.NotFound(w, r)
			return
		}
		fn(w, r, m[2])
	}
}

// wrap FS handler to inject ENV vars into index.html
func fsWrapper(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		// Inject ENV vars into index.html
		if r.URL.Path == "/" || r.URL.Path == "/index.html" {
			fileB, err := ioutil.ReadFile(appDir + "/index.html")
			if err == nil {
				newFileStr := strings.Replace(string(fileB), "__CERES_VIZ_ENV__", string(envJSON), 1)
				w.Write([]byte(newFileStr))
				return
			}
		}
		h.ServeHTTP(w, r)
	})
}

func main() {

	fmt.Println("Starting ROS Plot Server...")

	// set web app environment variables
	ignoreList := []string{}
	foundRosIgnore := false
	fileBytes, err := ioutil.ReadFile(rosIgnoreListPath)
	if err == nil {
		foundRosIgnore = true
		tempList := strings.Split(string(fileBytes), "\n")
		for _, path := range tempList {
			if len(path) > 0 && strings.HasPrefix(path, "/") {
				ignoreList = append(ignoreList, path)
			}
		}
	}
	fmt.Printf("Found %d ROS ignore paths in %s\n", len(ignoreList), rosIgnoreListPath)
	jsonStr, _ := json.Marshal(map[string][]string{
		"rosTopicIgnore": ignoreList,
	})
	envJSON = jsonStr

	// check app folder existence
	_, appPathErr := ioutil.ReadDir(appDir)
	if appPathErr != nil {
		panic("Unable to find './app' directory to serve web app")
	}

	// list files found in data
	files, err := ioutil.ReadDir(dataDir)
	if err != nil {
		panic("Unable to find './data' directory to read dashboard files")
	}
	// remove ros_ignore from dashboard file count
	dashCount := len(files)
	if foundRosIgnore {
		dashCount--
	}
	fmt.Printf("Found %d Dashboard files in %s\n", dashCount, dataDir)
	fmt.Print("Listening on configured port\n")

	http.Handle("/", fsWrapper(http.FileServer(http.Dir(appDir))))
	http.HandleFunc("/v0/dashboard/", makeHandler(dashboardHandler))
	log.Fatal(http.ListenAndServe(":5000", nil))
}
