package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"strings"
)

type Request struct {
	Method string                 `json:"method"`
	Params map[string]interface{} `json:"params"`
}

type Response struct {
	Result interface{} `json:"result"`
	Error  string       `json:"error,omitempty"`
}

func main() {
	scanner := bufio.NewScanner(os.Stdin)
	
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}

		var req Request
		if err := json.Unmarshal([]byte(line), &req); err != nil {
			respond(Response{Error: err.Error()})
			continue
		}

		var resp Response

		switch req.Method {
		case "filterDocuments":
			documentsJSON, _ := req.Params["documents"].(string)
			filterJSON, _ := req.Params["filter"].(string)
			maxResults, _ := req.Params["maxResults"].(float64)
			result := FilterDocuments(documentsJSON, filterJSON, int(maxResults))
			var resultData interface{}
			json.Unmarshal([]byte(result), &resultData)
			resp.Result = resultData

		case "getCandidateIds":
			filterJSON, _ := req.Params["filter"].(string)
			result := GetCandidateIds(filterJSON)
			var resultData interface{}
			json.Unmarshal([]byte(result), &resultData)
			resp.Result = resultData

		case "rebuildIndexMapping":
			indexesJSON, _ := req.Params["indexes"].(string)
			RebuildIndexMapping(indexesJSON)
			resp.Result = map[string]interface{}{"success": true}

		case "sortDocuments":
			documentsJSON, _ := req.Params["documents"].(string)
			sortJSON, _ := req.Params["sort"].(string)
			result := SortDocuments(documentsJSON, sortJSON)
			var resultData interface{}
			json.Unmarshal([]byte(result), &resultData)
			resp.Result = resultData

		case "projectDocuments":
			documentsJSON, _ := req.Params["documents"].(string)
			projectionJSON, _ := req.Params["projection"].(string)
			result := ProjectDocuments(documentsJSON, projectionJSON)
			var resultData interface{}
			json.Unmarshal([]byte(result), &resultData)
			resp.Result = resultData

		default:
			resp.Error = fmt.Sprintf("unknown method: %s", req.Method)
		}

		respond(resp)
	}
}

func respond(resp Response) {
	data, _ := json.Marshal(resp)
	fmt.Println(string(data))
}
