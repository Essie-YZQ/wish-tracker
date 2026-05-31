# PROJECT_STATUS.md

## Purpose

This file is a reusable project status snapshot for Bloom Journal.
Read `AGENTS_PLAYBOOK.md` first before using this file.

---

## Current Priority

- Fix: 中间水壶底座与两侧花瓶底座对齐 — **结构正确，spacer 数值偏小，尚未完成。**

---

## Current Project State

- App 已部署并正常运行：https://essie-yzq.github.io/wish-tracker/
- Firebase 实时同步 balances、habit status、weekly sources、vase flowers（两人互相看到对方花瓶）。
- 24 种 SVG 花朵 + 花瓶 bell-curve 排列完整。
- localStorage 是主状态存储；Firebase 是同步层。

---

## Recently Completed Work

- 2026-05-30 vase_flowers 同步至 Firebase（sVaseFlowers / kkVaseFlowers）。
- 2026-05-30 pick_flower、clear_vase、shuffle_vase 改为 async，写入 Firebase。
- 2026-05-30 修复了 production 的 JS 语法错误（旧 commit 在 line 946 有裸 SVG 代码）。

---

## Files Changed (uncommitted local changes)

- `style.css` — pool card 对齐相关改动（见下方 Known Issue）
- `script.js` — render_pool_card() 加了 pool_vessel_area 和 pool_bottom_spacer

---

## Known Issue: 水壶底座对齐（OPEN）

**目标**：中间水壶（Wish Pool card）底座与两侧花瓶底座在同一水平线。

**当前状态**：从截图可见，水壶底座比花瓶底座低约 55-70 CSS 像素。

**当前 HTML 结构（pool card）**：
```html
<article class="summary_card summary_card_pool">
  <p class="summary_label">Wish Pool</p>
  <div class="pool_vessel_area">       <!-- flex:1, align-items:flex-end -->
    <div class="decanter">...</div>
  </div>
  <div class="summary_value">2</div>
  <div class="pool_bottom_spacer"></div>  <!-- 目前 26px，太小 -->
</article>
```

**当前 CSS**：
```css
.summary_card_pool { display:flex; flex-direction:column; gap:8px; }
.pool_vessel_area  { flex:1; display:flex; align-items:flex-end; justify-content:center; }
.pool_bottom_spacer { height: 26px; }
.decanter { margin: 0 0 4px; }
```

**原理**：  
- 用户卡（S / KK）的花瓶底边 = card_bottom - padding(22) - balance_actions(~26px) - gap(8) - user_card_row(~34px) - gap(8) - vase_btn_row(~22px) - gap_in_vase_col(6px) = **card_bottom 上方约 126px**
- Pool card 的水壶底边 = card_bottom - padding(22) - spacer - gap(8) - summary_value(~34px) - gap(8) - decanter_margin(4px) = **card_bottom 上方 76 + spacer px**
- 两者对齐需要：76 + spacer = 126 → **spacer = 50px**（理论值）
- 但截图视觉差约 70px，故推荐先试 **spacer = 70px**

**下一步（最快路径）**：
1. 将 `.pool_bottom_spacer { height: 70px; }` 改为尝试值
2. 在本地 http://127.0.0.1:5500 检查是否对齐
3. 微调：偏高则减小，偏低则增大
4. 或：用 DevTools 量 `.balance_actions` 实际高度（选中元素 → Computed → height），加上 vase_btn_row(22px) + gap(6px) 即为 spacer 目标值

---

## Recent Decisions

- pool_vessel_area (flex:1) 是正确结构，与 card_vase_area (flex:1) 对称。
- pool_bottom_spacer 用来补齐两侧卡片在 vase 下方的额外内容（vase_btn_row + number + buttons）。
- 花只有在 flowers.length > wish_balance 时才自动移除（极简花瓶设计保留）。

---

## Open Questions

- pool_bottom_spacer 的精确高度：理论值 50px，视觉估计 70px，需实测确认。

---

## Recommended Next Step

```css
/* 先试这个值，在本地检查对齐效果 */
.pool_bottom_spacer { height: 70px; }
```

如果水壶偏高则减小到 60px；如果还偏低则增到 80px。

---

## Notes for Future AI Agents

- 读完 AGENTS_PLAYBOOK.md 再用本文件。
- 用中文解释，技术名词保留英文。
- 对齐问题是唯一未完成的任务。只需改 style.css 一行。
- 本地测试地址：http://127.0.0.1:5500/index.html
- 改完记得 commit + push 到 GitHub Pages。

---

## Last Updated

- Last updated by: Claude (claude-sonnet-4-6)
- Last updated date: 2026-05-30
