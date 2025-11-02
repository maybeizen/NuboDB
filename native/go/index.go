package main

import (
	"encoding/json"
	"sort"
	"strings"
	"sync"
)

type IndexEntry struct {
	Key   interface{}
	Value []string
}

type IndexMetadata struct {
	Name         string
	Fields       []string
	IndexMap     map[string][]string
	SortedEntries []IndexEntry
	mutex        sync.RWMutex
}

type IndexResolver struct {
	IndexMetadata map[string]*IndexMetadata
	FieldToIndex  map[string][]string
	mutex         sync.RWMutex
}

var resolver *IndexResolver
var resolverOnce sync.Once

func getResolver() *IndexResolver {
	resolverOnce.Do(func() {
		resolver = &IndexResolver{
			IndexMetadata: make(map[string]*IndexMetadata),
			FieldToIndex:  make(map[string][]string),
		}
	})
	return resolver
}

func extractFieldsFromIndexName(indexName string) []string {
	name := strings.TrimSuffix(indexName, "_index")
	return strings.FieldsFunc(name, func(c rune) bool {
		return c == '_'
	})
}

func RebuildIndexMapping(indexesJSON string) {
	var indexes map[string]map[string][]string
	if err := json.Unmarshal([]byte(indexesJSON), &indexes); err != nil {
		return
	}

	resolver := getResolver()
	resolver.mutex.Lock()
	defer resolver.mutex.Unlock()

	resolver.FieldToIndex = make(map[string][]string, len(indexes)*2)
	resolver.IndexMetadata = make(map[string]*IndexMetadata, len(indexes))

	for indexName, indexMap := range indexes {
		fields := extractFieldsFromIndexName(indexName)

		metadata := &IndexMetadata{
			Name:     indexName,
			Fields:   fields,
			IndexMap: make(map[string][]string, len(indexMap)),
		}

		for key, ids := range indexMap {
			metadata.IndexMap[key] = ids
		}

		resolver.IndexMetadata[indexName] = metadata

		for _, field := range fields {
			if resolver.FieldToIndex[field] == nil {
				resolver.FieldToIndex[field] = make([]string, 0, 1)
			}
			resolver.FieldToIndex[field] = append(resolver.FieldToIndex[field], indexName)
		}
	}
}

func findIndexesForField(field string) []string {
	resolver := getResolver()
	resolver.mutex.RLock()
	defer resolver.mutex.RUnlock()
	return resolver.FieldToIndex[field]
}

func getFieldIdsFromValue(index *IndexMetadata, value interface{}) []string {
	index.mutex.RLock()
	defer index.mutex.RUnlock()

	valueStr := valueToString(value)
	if ids, exists := index.IndexMap[valueStr]; exists {
		idsCopy := make([]string, len(ids))
		copy(idsCopy, ids)
		return idsCopy
	}
	return nil
}

func getFieldIdsFromOperators(index *IndexMetadata, operators map[string]interface{}) []string {
	if eqVal, ok := operators["$eq"]; ok {
		return getFieldIdsFromValue(index, eqVal)
	}

	if inArr, ok := operators["$in"].([]interface{}); ok {
		if len(inArr) == 0 {
			return nil
		}
		result := make([]string, 0, len(inArr)*2)
		seen := make(map[string]bool, len(inArr)*2)
		for _, val := range inArr {
			if val == nil {
				continue
			}
			ids := getFieldIdsFromValue(index, val)
			for _, id := range ids {
				if !seen[id] {
					result = append(result, id)
					seen[id] = true
				}
			}
		}
		return result
	}

	if _, hasGte := operators["$gte"]; hasGte {
		return getFieldIdsFromRange(index, operators)
	}
	if _, hasGt := operators["$gt"]; hasGt {
		return getFieldIdsFromRange(index, operators)
	}
	if _, hasLte := operators["$lte"]; hasLte {
		return getFieldIdsFromRange(index, operators)
	}
	if _, hasLt := operators["$lt"]; hasLt {
		return getFieldIdsFromRange(index, operators)
	}

	return nil
}

func getFieldIdsFromRange(index *IndexMetadata, operators map[string]interface{}) []string {
	var minValue, maxValue float64
	var useMinInclusive, useMaxInclusive bool

	if gte, ok := operators["$gte"].(float64); ok {
		minValue = gte
		useMinInclusive = true
	} else if gt, ok := operators["$gt"].(float64); ok {
		minValue = gt
		useMinInclusive = false
	} else {
		minValue = -1e308
	}

	if lte, ok := operators["$lte"].(float64); ok {
		maxValue = lte
		useMaxInclusive = true
	} else if lt, ok := operators["$lt"].(float64); ok {
		maxValue = lt
		useMaxInclusive = false
	} else {
		maxValue = 1e308
	}

	index.mutex.RLock()
	sortedEntries := index.SortedEntries
	index.mutex.RUnlock()

	if sortedEntries == nil {
		index.mutex.Lock()
		if index.SortedEntries == nil {
			entries := make([]IndexEntry, 0, len(index.IndexMap))
			for key, ids := range index.IndexMap {
				if numVal := stringToNumber(key); numVal != nil {
					entries = append(entries, IndexEntry{
						Key:   *numVal,
						Value: ids,
					})
				}
			}
			sort.Slice(entries, func(i, j int) bool {
				valI, okI := toNumber(entries[i].Key)
				valJ, okJ := toNumber(entries[j].Key)
				if !okI || !okJ {
					return false
				}
				return valI < valJ
			})
			index.SortedEntries = entries
		}
		sortedEntries = index.SortedEntries
		index.mutex.Unlock()
	}

	if len(sortedEntries) == 0 {
		return nil
	}

	result := make([]string, 0, len(sortedEntries))
	seen := make(map[string]bool, len(sortedEntries))

	for _, entry := range sortedEntries {
		numVal, ok := toNumber(entry.Key)
		if !ok {
			continue
		}

		matches := true
		if minValue != -1e308 {
			if useMinInclusive {
				matches = numVal >= minValue
			} else {
				matches = numVal > minValue
			}
		}
		if matches && maxValue != 1e308 {
			if useMaxInclusive {
				matches = numVal <= maxValue
			} else {
				matches = numVal < maxValue
			}
		}

		if matches {
			for _, id := range entry.Value {
				if !seen[id] {
					result = append(result, id)
					seen[id] = true
				}
			}
		} else if numVal > maxValue {
			break
		}
	}

	return result
}

func GetCandidateIds(filterJSON string) string {
	var filter map[string]interface{}
	if err := json.Unmarshal([]byte(filterJSON), &filter); err != nil {
		return `{"error":"` + err.Error() + `"}`
	}

	resolver := getResolver()
	resolver.mutex.RLock()
	defer resolver.mutex.RUnlock()

	var candidateIds []string
	usedIndexes := make(map[string]bool, len(filter))

	for field, value := range filter {
		if len(field) > 0 && field[0] == '$' {
			continue
		}

		indexNames := resolver.FieldToIndex[field]
		if len(indexNames) == 0 {
			continue
		}

		for _, indexName := range indexNames {
			if usedIndexes[indexName] {
				continue
			}

			metadata := resolver.IndexMetadata[indexName]
			if metadata == nil {
				continue
			}

			var fieldIds []string
			if valueMap, ok := value.(map[string]interface{}); ok {
				fieldIds = getFieldIdsFromOperators(metadata, valueMap)
			} else {
				fieldIds = getFieldIdsFromValue(metadata, value)
			}

			if fieldIds == nil || len(fieldIds) == 0 {
				continue
			}

			usedIndexes[indexName] = true

			if candidateIds == nil {
				candidateIds = fieldIds
			} else {
				candidateIds = intersectSlices(candidateIds, fieldIds)
				if len(candidateIds) == 0 {
					break
				}
			}
		}
		if candidateIds != nil && len(candidateIds) == 0 {
			break
		}
	}

	result := map[string]interface{}{
		"ids": candidateIds,
	}
	resultJSON, _ := json.Marshal(result)
	return string(resultJSON)
}

func intersectSlices(slice1, slice2 []string) []string {
	if len(slice1) == 0 || len(slice2) == 0 {
		return []string{}
	}

	if len(slice1) > len(slice2) {
		slice1, slice2 = slice2, slice1
	}

	set2 := make(map[string]bool, len(slice2))
	for _, id := range slice2 {
		set2[id] = true
	}

	result := make([]string, 0, min(len(slice1), len(slice2)))
	seen := make(map[string]bool, len(slice1))
	for _, id := range slice1 {
		if set2[id] && !seen[id] {
			result = append(result, id)
			seen[id] = true
		}
	}
	return result
}

func valueToString(value interface{}) string {
	if str, ok := value.(string); ok {
		return str
	}
	data, _ := json.Marshal(value)
	return string(data)
}

func stringToNumber(s string) *float64 {
	var f float64
	if err := json.Unmarshal([]byte(s), &f); err == nil {
		return &f
	}
	return nil
}