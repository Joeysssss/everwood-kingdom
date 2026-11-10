# 翡翠王國：守護森林之心

一款以 React、TypeScript、Phaser 3、Tailwind CSS 與 Zustand 製作的奇幻塔防網頁遊戲。遊戲畫面使用 Phaser Graphics 即時繪製原創森林、城堡、英雄、敵人、塔樓與戰鬥特效；沒有使用未授權的第三方美術素材。進度只儲存在瀏覽器 LocalStorage，不需要後端。

## 本機安裝與啟動

需求：Node.js 20.19+（或 22.12+）及 npm。

```bash
npm install
npm run dev
```

開啟終端機顯示的本機網址（通常是 `http://localhost:5173`）。正式建置與本機預覽：

```bash
npm run build
npm run preview
```

## 遊戲操作

- 點選「開始守衛」後，在右側選擇防禦塔，再點擊戰場上的金色固定塔位建造。
- 點選已建造的塔可檢視攻擊範圍、升級（最高 Lv.3）或以投入金額 60% 出售。
- 按「召喚第一波敵人」開始戰鬥。敵軍分 20 波；Boss 在第 20 波登場。完成當前波次的出兵後，可提前召喚下一波；提早召喚會獲得額外金幣。
- 點擊戰場移動英雄；英雄會自動攻擊附近敵人。流星火雨按 `Q`，召喚援軍按 `W`；技能均有冷卻時間。
- 可暫停戰鬥、切換 1×/2× 速度。手機上可直接點擊地圖、塔位與操作按鈕。
- 點擊頁面右上角音符按鈕可開啟或關閉原創合成音效。
- 城堡生命降至 0 即告失敗；守住最後一波並消滅 Boss 即獲勝。最佳波次與勝場會保存在本機。

## 技術架構

- React + TypeScript + Vite：介面、型別與開發/建置流程
- Phaser 3：地圖、敵軍路徑、塔樓攻擊、英雄移動、波次與戰鬥渲染
- Tailwind CSS：Vite 整合；介面使用輕量自訂 CSS 補足遊戲視覺
- Zustand：遊戲狀態、塔樓操作，以及 `persist` LocalStorage 存檔

## 上傳至 GitHub

1. 在 GitHub 建立一個新的空白 repository（不需預先建立 README 或 `.gitignore`）。
2. 在專案根目錄執行以下指令，將 `<你的帳號>`、`<repository 名稱>` 換成自己的資料：

```bash
git init
git add .
git commit -m "Build Everwood tower defense game"
git branch -M main
git remote add origin https://github.com/<你的帳號>/<repository 名稱>.git
git push -u origin main
```

若專案已經初始化 Git，略過 `git init`；若已設定遠端，略過 `git remote add origin ...`。

## 部署到 Vercel

### GitHub 匯入（建議）

1. 將專案推送至 GitHub。
2. 登入 [Vercel](https://vercel.com/)，選擇 **Add New → Project**，匯入此 GitHub repository。
3. Vercel 會讀取專案中的 `vercel.json`。確認設定為 **Build Command** `npm run build`、**Output Directory** `dist`，然後按 **Deploy**。
4. 部署完成後使用 Vercel 提供的網址遊玩。之後推送到 GitHub 的新 commit 會自動觸發重新部署。

### Vercel CLI

```bash
npm install --global vercel
vercel
```

依照互動提示登入並連結專案；正式部署時執行：

```bash
vercel --prod
```

此遊戲沒有伺服器端 API、環境變數或資料庫設定。遊戲存檔存在玩家的瀏覽器中，清除該網站的瀏覽資料會一併清除存檔。
