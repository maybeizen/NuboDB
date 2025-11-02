package main

import (
	"encoding/json"
	"sort"
	"strings"
	"time"
)

type SortField struct {
	Field     string
	Direction int
}

func parseSort(sortJSON string) ([]SortField, error) {
	var sortMap map[string]interface{}
	if err := json.Unmarshal([]byte(sortJSON), &sortMap); err != nil {
		return nil, err
	}

	fields := make([]SortField, 0, len(sortMap))
	for field, dir := range sortMap {
		direction := 1
		if dirNum, ok := dir.(float64); ok {
			if dirNum < 0 {
				direction = -1
			}
		}
		fields = append(fields, SortField{
			Field:     field,
			Direction: direction,
		})
	}
	return fields, nil
}

func compareValues(a, b interface{}, direction int) int {
	if a == nil && b == nil {
		return 0
	}
	if a == nil {
		return -1 * direction
	}
	if b == nil {
		return 1 * direction
	}

	aType := getType(a)
	bType := getType(b)

	if aType != bType {
		return 0
	}

	switch aType {
	case "string":
		strA := a.(string)
		strB := b.(string)
		result := strings.Compare(strA, strB)
		if result != 0 {
			return result * direction
		}
		return 0
	case "number":
		numA, _ := toNumber(a)
		numB, _ := toNumber(b)
		diff := numA - numB
		if diff != 0 {
			if diff < 0 {
				return -1 * direction
			}
			return 1 * direction
		}
		return 0
	case "date":
		timeA, okA := parseTime(a)
		timeB, okB := parseTime(b)
		if okA && okB {
			diff := timeA.Sub(timeB)
			if diff != 0 {
				if diff < 0 {
					return -1 * direction
				}
				return 1 * direction
			}
			return 0
		}
		return 0
	case "boolean":
		boolA := a.(bool)
		boolB := b.(bool)
		if boolA == boolB {
			return 0
		}
		if boolA {
			return 1 * direction
		}
		return -1 * direction
	default:
		return 0
	}
}

func getType(v interface{}) string {
	switch v.(type) {
	case string:
		return "string"
	case float64, float32, int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64:
		return "number"
	case bool:
		return "boolean"
	case time.Time:
		return "date"
	}
	if str, ok := v.(string); ok {
		if _, err := time.Parse(time.RFC3339, str); err == nil {
			return "date"
		}
	}
	return "unknown"
}

func parseTime(v interface{}) (time.Time, bool) {
	if t, ok := v.(time.Time); ok {
		return t, true
	}
	if str, ok := v.(string); ok {
		if t, err := time.Parse(time.RFC3339, str); err == nil {
			return t, true
		}
		if t, err := time.Parse(time.RFC3339Nano, str); err == nil {
			return t, true
		}
	}
	return time.Time{}, false
}

func getFieldValue(doc map[string]interface{}, field string) interface{} {
	if val, ok := doc[field]; ok {
		return val
	}
	return nil
}

func SortDocuments(documentsJSON string, sortJSON string) string {
	var documents []map[string]interface{}
	if err := json.Unmarshal([]byte(documentsJSON), &documents); err != nil {
		return `{"error":"` + err.Error() + `"}`
	}

	sortFields, err := parseSort(sortJSON)
	if err != nil {
		return `{"error":"` + err.Error() + `"}`
	}

	if len(documents) <= 1 || len(sortFields) == 0 {
		result, _ := json.Marshal(map[string]interface{}{"results": documents})
		return string(result)
	}

	sort.Slice(documents, func(i, j int) bool {
		for _, sortField := range sortFields {
			valI := getFieldValue(documents[i], sortField.Field)
			valJ := getFieldValue(documents[j], sortField.Field)
			comparison := compareValues(valI, valJ, sortField.Direction)
			if comparison != 0 {
				return comparison < 0
			}
		}
		return false
	})

	result, _ := json.Marshal(map[string]interface{}{"results": documents})
	return string(result)
}
