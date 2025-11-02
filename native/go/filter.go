package main

import (
	"encoding/json"
	"regexp"
	"runtime"
	"sync"
	"sync/atomic"
)

const (
	maxRegexCacheSize = 1000
	numWorkersFactor  = 2
	batchSize         = 100
)

var (
	regexCache = make(map[string]*regexp.Regexp, maxRegexCacheSize)
	regexMutex sync.RWMutex
)

type FilterEntry struct {
	Field string
	Value interface{}
}

func parseFilter(filterJSON string) ([]FilterEntry, error) {
	var filterMap map[string]interface{}
	if err := json.Unmarshal([]byte(filterJSON), &filterMap); err != nil {
		return nil, err
	}

	entries := make([]FilterEntry, 0, len(filterMap))
	for field, value := range filterMap {
		entries = append(entries, FilterEntry{
			Field: field,
			Value: value,
		})
	}
	return entries, nil
}

func getCachedRegex(pattern string) *regexp.Regexp {
	regexMutex.RLock()
	if regex, exists := regexCache[pattern]; exists {
		regexMutex.RUnlock()
		return regex
	}
	regexMutex.RUnlock()

	regexMutex.Lock()
	defer regexMutex.Unlock()

	if regex, exists := regexCache[pattern]; exists {
		return regex
	}

	regex, err := regexp.Compile(pattern)
	if err != nil {
		return nil
	}

	if len(regexCache) >= maxRegexCacheSize {
		for k := range regexCache {
			delete(regexCache, k)
			break
		}
	}
	regexCache[pattern] = regex
	return regex
}

func matchesComparisonOperators(value interface{}, operators map[string]interface{}) bool {
	for op, opValue := range operators {
		switch op {
		case "$eq":
			if !deepEqual(value, opValue) {
				return false
			}
		case "$ne":
			if deepEqual(value, opValue) {
				return false
			}
		case "$gt":
			if numVal, ok := toNumber(value); ok {
				if numOp, ok := toNumber(opValue); ok {
					if numVal <= numOp {
						return false
					}
				}
			}
		case "$gte":
			if numVal, ok := toNumber(value); ok {
				if numOp, ok := toNumber(opValue); ok {
					if numVal < numOp {
						return false
					}
				}
			}
		case "$lt":
			if numVal, ok := toNumber(value); ok {
				if numOp, ok := toNumber(opValue); ok {
					if numVal >= numOp {
						return false
					}
				}
			}
		case "$lte":
			if numVal, ok := toNumber(value); ok {
				if numOp, ok := toNumber(opValue); ok {
					if numVal > numOp {
						return false
					}
				}
			}
		case "$in":
			if arr, ok := opValue.([]interface{}); ok {
				inSet := make(map[interface{}]bool, len(arr))
				for _, v := range arr {
					inSet[v] = true
				}
				if !inSet[value] {
					return false
				}
			}
		case "$nin":
			if arr, ok := opValue.([]interface{}); ok {
				ninSet := make(map[interface{}]bool, len(arr))
				for _, v := range arr {
					ninSet[v] = true
				}
				if ninSet[value] {
					return false
				}
			}
		case "$exists":
			if exists, ok := opValue.(bool); ok {
				if exists && value == nil {
					return false
				}
				if !exists && value != nil {
					return false
				}
			}
		case "$regex":
			if strVal, ok := value.(string); ok {
				if pattern, ok := opValue.(string); ok {
					regex := getCachedRegex(pattern)
					if regex == nil || !regex.MatchString(strVal) {
						return false
					}
				}
			} else {
				return false
			}
		}
	}
	return true
}

func matchesLogicalOperator(document map[string]interface{}, operator string, conditions []interface{}) bool {
	switch operator {
	case "$and":
		for _, condition := range conditions {
			if condMap, ok := condition.(map[string]interface{}); ok {
				entries := make([]FilterEntry, 0, len(condMap))
				for field, value := range condMap {
					entries = append(entries, FilterEntry{Field: field, Value: value})
				}
				if !matchesFilter(document, entries) {
					return false
				}
			}
		}
		return true
	case "$or":
		for _, condition := range conditions {
			if condMap, ok := condition.(map[string]interface{}); ok {
				entries := make([]FilterEntry, 0, len(condMap))
				for field, value := range condMap {
					entries = append(entries, FilterEntry{Field: field, Value: value})
				}
				if matchesFilter(document, entries) {
					return true
				}
			}
		}
		return false
	case "$nor":
		for _, condition := range conditions {
			if condMap, ok := condition.(map[string]interface{}); ok {
				entries := make([]FilterEntry, 0, len(condMap))
				for field, value := range condMap {
					entries = append(entries, FilterEntry{Field: field, Value: value})
				}
				if matchesFilter(document, entries) {
					return false
				}
			}
		}
		return true
	}
	return true
}

func matchesFilter(document map[string]interface{}, entries []FilterEntry) bool {
	for _, entry := range entries {
		if len(entry.Field) > 0 && entry.Field[0] == '$' {
			if conditions, ok := entry.Value.([]interface{}); ok {
				if !matchesLogicalOperator(document, entry.Field, conditions) {
					return false
				}
			}
		} else {
			fieldValue := document[entry.Field]
			if valueMap, ok := entry.Value.(map[string]interface{}); ok {
				if !matchesComparisonOperators(fieldValue, valueMap) {
					return false
				}
			} else {
				if !deepEqual(fieldValue, entry.Value) {
					return false
				}
			}
		}
	}
	return true
}

func FilterDocuments(documentsJSON string, filterJSON string, maxResults int) string {
	var documents []map[string]interface{}
	if err := json.Unmarshal([]byte(documentsJSON), &documents); err != nil {
		return `{"error":"` + err.Error() + `"}`
	}

	entries, err := parseFilter(filterJSON)
	if err != nil {
		return `{"error":"` + err.Error() + `"}`
	}

	if maxResults == 0 || len(documents) == 0 {
		return `{"results":[]}`
	}

	if len(entries) == 0 {
		if maxResults < len(documents) {
			documents = documents[:maxResults]
		}
		result, _ := json.Marshal(map[string]interface{}{"results": documents})
		return string(result)
	}

	docCount := len(documents)
	if docCount <= batchSize {
		results := make([]map[string]interface{}, 0, min(maxResults, docCount))
		for i := 0; i < docCount && len(results) < maxResults; i++ {
			if matchesFilter(documents[i], entries) {
				results = append(results, documents[i])
			}
		}
		resultJSON, _ := json.Marshal(map[string]interface{}{"results": results})
		return string(resultJSON)
	}

	numWorkers := runtime.NumCPU() * numWorkersFactor
	if numWorkers > docCount {
		numWorkers = docCount
	}
	if numWorkers < 1 {
		numWorkers = 1
	}

	type docResult struct {
		doc   map[string]interface{}
		index int
	}

	docCh := make(chan docResult, batchSize*2)
	results := make([]map[string]interface{}, 0, maxResults)
	resultMu := sync.Mutex{}
	resultCount := int32(0)
	var wg sync.WaitGroup
	var done int32

	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for res := range docCh {
				if atomic.LoadInt32(&done) == 1 {
					continue
				}

				if matchesFilter(res.doc, entries) {
					resultMu.Lock()
					if resultCount < int32(maxResults) {
						results = append(results, res.doc)
						resultCount++
						if resultCount >= int32(maxResults) {
							atomic.StoreInt32(&done, 1)
						}
					}
					resultMu.Unlock()
				}
			}
		}()
	}

	go func() {
		for i, doc := range documents {
			if atomic.LoadInt32(&done) == 1 {
				break
			}
			docCh <- docResult{doc: doc, index: i}
		}
		close(docCh)
	}()

	wg.Wait()

	resultJSON, _ := json.Marshal(map[string]interface{}{"results": results})
	return string(resultJSON)
}