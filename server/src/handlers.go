package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"strings"
)

// GET, GET all, POST, DELETE handler switch for dashboards endpoint
func dashboardHandler(w http.ResponseWriter, r *http.Request, subMatch string) {

	switch r.Method {
	case http.MethodGet:
		if len(subMatch) > 0 {
			handleGetDashboard(w, r, subMatch)
		} else {
			handleGetDashboards(w, r)
		}

	case http.MethodPost:
		handlePostDashboard(w, r, subMatch)

	case http.MethodDelete:
		handleDeleteDashboard(w, r, subMatch)

	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

// DELETE Dashboard
func handleDeleteDashboard(w http.ResponseWriter, r *http.Request, name string) {
	oldPath := getDashboardPath(name)
	newPath := getDashboardPath(RemovedPrefix + name)
	err := os.Rename(oldPath, newPath)
	if err != nil {
		fmt.Printf("Failed to delete %s. error: %s \n", oldPath, err.Error())
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

// POST new Dashboard
func handlePostDashboard(w http.ResponseWriter, r *http.Request, name string) {
	jsonBytes, err := ioutil.ReadAll(r.Body)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	path := getDashboardPath(name)
	err = ioutil.WriteFile(path, jsonBytes, 0600)
	if err != nil {
		fmt.Printf("Failed to write %s. error: %s \n", path, err.Error())
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

// GET specific dashboard
func handleGetDashboard(w http.ResponseWriter, r *http.Request, name string) {

	path := getDashboardPath(name)
	jsonBytes, err := ioutil.ReadFile(path)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(jsonBytes)
}

// GET all dashboards
func handleGetDashboards(w http.ResponseWriter, r *http.Request) {

	files, err := ioutil.ReadDir(dataDir)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	dashboardMap := map[string]interface{}{}
	for _, file := range files {
		// Skip directories and files flagged for deletion
		if file.IsDir() || !strings.Contains(file.Name(), ".json") || strings.Contains(file.Name(), RemovedPrefix) {
			continue
		}
		path := getDashboardPath(file.Name())
		b, err := ioutil.ReadFile(path)
		if err != nil {
			fmt.Printf("Error reading file %s. %s\n", file.Name(), err)
			continue
		}
		name := strings.Split(file.Name(), ".")[0]
		temp := map[string]interface{}{}
		err = json.Unmarshal(b, &temp)
		if err != nil {
			fmt.Printf("Un-marshalling JSON failed for file: %s\n", file.Name())
			continue
		}
		dashboardMap[name] = temp
	}
	jsonBytes, err := json.Marshal(&dashboardMap)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write(jsonBytes)
}
