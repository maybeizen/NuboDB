package main

import (
	"encoding/json"
)

func parseProjection(projectionJSON string) (map[string]int, error) {
	var projection map[string]interface{}
	if err := json.Unmarshal([]byte(projectionJSON), &projection); err != nil {
		return nil, err
	}

	result := make(map[string]int, len(projection))
	for field, value := range projection {
		if valNum, ok := value.(float64); ok {
			result[field] = int(valNum)
		}
	}
	return result, nil
}

func ProjectDocuments(documentsJSON string, projectionJSON string) string {
	var documents []map[string]interface{}
	if err := json.Unmarshal([]byte(documentsJSON), &documents); err != nil {
		return `{"error":"` + err.Error() + `"}`
	}

	projection, err := parseProjection(projectionJSON)
	if err != nil {
		return `{"error":"` + err.Error() + `"}`
	}

	if len(documents) == 0 || len(projection) == 0 {
		result, _ := json.Marshal(map[string]interface{}{"results": documents})
		return string(result)
	}

	includeFields := make([]string, 0, len(projection))
	excludeFields := make([]string, 0, len(projection))
	for field, value := range projection {
		if value == 1 {
			includeFields = append(includeFields, field)
		} else if value == 0 {
			excludeFields = append(excludeFields, field)
		}
	}

	projected := make([]map[string]interface{}, len(documents))
	for i, doc := range documents {
		projDoc := make(map[string]interface{})

		if len(includeFields) > 0 {
			for _, field := range includeFields {
				if val, ok := doc[field]; ok {
					projDoc[field] = val
				}
			}
		} else {
			for field, val := range doc {
				excluded := false
				for _, exField := range excludeFields {
					if field == exField {
						excluded = true
						break
					}
				}
				if !excluded {
					projDoc[field] = val
				}
			}
		}

		projected[i] = projDoc
	}

	result, _ := json.Marshal(map[string]interface{}{"results": projected})
	return string(result)
}
