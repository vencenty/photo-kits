package main

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math/rand"
	"time"
)

// GenerateAlias 生成一个尽量不重复的别名
func GenerateAlias(prefix string) string {
	// 获取当前时间戳（纳秒级）
	timestamp := time.Now().UnixNano()

	// 生成一个随机数
	rand.Seed(timestamp)
	randomNum := rand.Int63()

	// 组合字符串
	rawString := fmt.Sprintf("%s-%d-%d", prefix, timestamp, randomNum)

	// 生成 SHA256 哈希
	hash := sha256.Sum256([]byte(rawString))

	// 转换为十六进制字符串（取前16位即可，避免过长）
	return prefix + "-" + hex.EncodeToString(hash[:])[:16]
}

func main() {
	for i := 0; i < 5; i++ {
		fmt.Println(GenerateAlias("img"))
	}
}
