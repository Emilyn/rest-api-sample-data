package store

import (
	"encoding/json"
	"os"
	"path/filepath"
)

var DataDir = "data"

func filePath(name string) string {
	return filepath.Join(DataDir, name+".json")
}

// ReadJSON loads name.json from the data dir into a value of type T.
// If the file doesn't exist, fallback is returned instead.
func ReadJSON[T any](name string, fallback T) (T, error) {
	path := filePath(name)
	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return fallback, nil
	}
	if err != nil {
		return fallback, err
	}
	var out T
	if len(data) == 0 {
		return fallback, nil
	}
	if err := json.Unmarshal(data, &out); err != nil {
		return fallback, err
	}
	return out, nil
}

// Exists reports whether name.json has been written before.
func Exists(name string) bool {
	_, err := os.Stat(filePath(name))
	return err == nil
}

func WriteJSON[T any](name string, value T) error {
	if err := os.MkdirAll(DataDir, 0o755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filePath(name), data, 0o644)
}
