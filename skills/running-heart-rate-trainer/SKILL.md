---
name: running-heart-rate-trainer
description: Use when tracking running training with heart rate, pace, and distance data, or when optimizing training plans based on heart rate zones and personal biometrics
---

# Running Heart Rate Trainer

## Overview

根据心率、配速、距离数据优化跑步训练计划。考虑用户生物特征（年龄、体重、心率）计算个性化训练区间。

## 用户生物特征（自动应用）

- 年龄：25岁
- 身高：172cm
- 体重：83kg
- 静息心率：59-60 bpm
- 心肺功能：良好（静息心率偏低）

## 核心计算

### 最大心率
```
最大心率 = 220 - 年龄 = 195 bpm
```

### 心率储备（Karvonen公式）
```
心率储备 = 最大心率 - 静息心率 = 135
目标心率 = (心率储备 × 强度%) + 静息心率
```

### 训练区间

| 区间 | 强度 | 目标心率 | 效果 |
|------|------|----------|------|
| Z1 | 50-60% | 127-141 bpm | 轻松跑/恢复 |
| Z2 | 60-70% | 141-155 bpm | 有氧耐力 |
| Z3 | 70-80% | 155-168 bpm | 乳酸阈值 |
| Z4 | 80-90% | 168-182 bpm | 无氧耐力 |
| Z5 | 90-100% | 182-195 bpm | 最大强度 |

## 数据存储格式

训练记录保存至 `~/.claude/projects/-mnt-d-assistant/data/running_trainings.json`：

```json
{
  "profile": {
    "age": 25,
    "height_cm": 172,
    "weight_kg": 83,
    "resting_hr": 60,
    "max_hr": 195
  },
  "trainings": [
    {
      "date": "2026-04-29",
      "distance_km": 5.0,
      "duration_min": 30,
      "avg_pace_min_per_km": 6.0,
      "avg_hr": 155,
      "max_hr": 175,
      "elevation_m": 50,
      "feeling": "good",
      "notes": "早晨训练"
    }
  ]
}
```

## 添加训练记录

用户提供：日期、距离(km)、时长(分钟)、平均心率、最大心率、感受(1-5)

自动计算：配速、心率区间分布、训练负荷

## 训练分析

### 配速-心率关系评估
- Z2区间训练比例 > 80% = 有氧基础扎实
- Z3区间训练比例高 = 乳酸阈值提升中
- Z5区间过多 = 恢复不足风险

### 训练负荷
```
Training Load = 距离 × 平均心率 / 100
```

### 效率指标
```
跑步效率 = 距离(km) / 体重(kg)
心率恢复 = 最大心率 - 1分钟后心率
```

## 训练建议

| 现状 | 建议 |
|------|------|
| Z1比例过高 | 增加Z2/Z3区间训练 |
| Z3比例过低 | 加入节奏跑 |
| 心率恢复慢 | 增加恢复跑，减少高强度 |
| 配速停滞 | 间歇训练提升 |
| 体重超标 | 低强度长距离(LSD)减脂 |

## Quick Reference

```
轻松跑: HR < 155 bpm (Z2)
节奏跑: HR 155-168 bpm (Z3)
间歇跑: HR > 175 bpm (Z4/Z5)
恢复跑: HR < 140 bpm，次日
```
