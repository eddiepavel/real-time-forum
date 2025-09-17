package utils

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

func HashPassword(password string) (string, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(hashed), err
}

// CompareHashAndPassword compares a hashed password with a plain-text one
func CompareHashAndPassword(hashedPassword, plainPassword string) error {
	return bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(plainPassword))
}

func GenerateToken(length int) (string, error) {
	bytes := make([]byte, length) // 16 bytes = 128 bits
	_, err := rand.Read(bytes)
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func DdSessionTimeSeconds(date string) int {

	layout := "2006-01-02 15:04:05"

	targetTime, err := time.Parse(layout, date)
	if err != nil {
		fmt.Println("Error parsing time:", err)
		return -1
	}

	currentTime := time.Now()

	maxAge := int(targetTime.Sub(currentTime).Seconds())

	if maxAge < 0 {
		maxAge = 0
	}

	return maxAge
}

func CompareDatesLess(date1 time.Time, date2 string) bool {
	layout := "2006-01-02 15:04:05"

	time2, err := time.Parse(layout, date2)
	if err != nil {
		fmt.Println("Error parsing time:", err)
		return false
	}

	return date1.Before(time2)
}

func SaveBase64ToFile(base64Str string) (string, error) {

	// Get extension BEFORE stripping prefix
	extension := getExtensionFromBase64(base64Str)
	if extension == "" {
		return "", errors.New("no extension")
	}

	if idx := strings.Index(base64Str, ","); idx != -1 {
		base64Str = base64Str[idx+1:]
	}

	filename, _ := GenerateToken(8)

	data, err := base64.StdEncoding.DecodeString(base64Str)
	if err != nil {
		return "", errors.New("invalid base64 data")
	}
	imagesDir := filepath.Join("../public", "images")
	if err := os.MkdirAll(imagesDir, 0755); err != nil {
		return "", err
	}

	filePath := filepath.Join(imagesDir, filename+extension)

	err = os.WriteFile(filePath, data, 0644)
	if err != nil {
		return "", err
	}

	return filename + extension, nil
}

func getExtensionFromBase64(base64Str string) string {
	if strings.HasPrefix(base64Str, "data:") {
		parts := strings.SplitN(base64Str, ";", 2)
		if len(parts) > 0 {
			mimeType := strings.TrimPrefix(parts[0], "data:")
			exts, _ := mime.ExtensionsByType(mimeType)
			if len(exts) > 0 {
				return exts[0]
			}
		}
	}
	return ""
}

func ConvertQueryToNumber(r *http.Request, key string) (int64, error) {
	num, err := strconv.ParseInt(r.URL.Query().Get(key), 10, 64)

	if err != nil {
		return 0, errors.New("")
	}

	return num, nil
}

func ConvertPathValueNumber(r *http.Request, key string) (int64, error) {
	num, err := strconv.ParseInt(r.PathValue(key), 10, 64)

	if err != nil {
		return 0, errors.New("")
	}

	return num, nil
}
