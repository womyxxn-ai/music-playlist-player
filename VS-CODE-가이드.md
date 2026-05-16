# VS Code 복사·붙여넣기 가이드 (초보자용)

## A. 새 프로젝트로 시작 (추천)

### 1단계 — VS Code에서 폴더 열기

1. VS Code 실행
2. **파일 → 폴더 열기**
3. 아래 폴더 선택:

```
C:\Users\lee2y\.cursor\projects\empty-window\music-playlist-player
```

### 2단계 — 터미널에서 패키지 설치

1. VS Code에서 **터미널 → 새 터미널** (단축키 `` Ctrl+` ``)
2. 아래를 **한 줄씩** 붙여넣고 Enter:

```powershell
npm install
```

### 3단계 — 개발 서버 실행

```powershell
npm run dev
```

터미널에 `http://localhost:5173` 같은 주소가 나오면 **Ctrl+클릭**해서 브라우저에서 엽니다.

> 예전에 `localhost:3000`을 쓰셨다면, 이번 Vite 프로젝트는 보통 **5173** 포트입니다.

---

## B. 이미 만든 React 프로젝트가 있는 경우

기존 `localhost:3000` 프로젝트 폴더를 VS Code로 연 뒤:

### 1) 패키지 설치 (터미널)

```powershell
npm install react-player
```

`react-h5-audio-player`는 더 이상 필요 없으면 제거해도 됩니다:

```powershell
npm uninstall react-h5-audio-player
```

### 2) 파일 복사

이 폴더의 파일을 **기존 프로젝트**에 덮어씁니다:

| 복사할 파일 | 붙여넣을 위치 (보통) |
|------------|---------------------|
| `src/App.jsx` | `src/App.jsx` |
| `src/App.css` | `src/App.css` (새로 만들기) |
| `src/tracks.js` | `src/tracks.js` (새로 만들기) |

`src/main.jsx` 맨 위에 `import './index.css'` 가 있는지 확인하세요.

### 3) 실행

```powershell
npm start
```

또는

```powershell
npm run dev
```

---

## C. 유튜브 곡 추가하는 방법

`src/tracks.js` 를 열고, 아래 형식으로 곡을 추가합니다.

```javascript
{
  title: '곡 제목',
  artist: '가수',
  album: '앨범',
  duration: '3:20',
  cover: 'https://이미지주소.jpg',
  youtube: 'https://www.youtube.com/watch?v=영상ID',
},
```

- **youtube** 가 있으면 → 유튜브로 재생 (1순위)
- youtube 없고 **url** 만 있으면 → MP3 링크로 재생

유튜브 링크 예시:

- `https://www.youtube.com/watch?v=RgKAFK5djSk`
- `https://youtu.be/RgKAFK5djSk`

---

## D. 노션에 넣기 (나중에)

1. `npm run build` 로 빌드
2. Vercel / Netlify 등에 GitHub 연결 후 배포
3. 받은 `https://....` 주소를 노션에서 `/embed` 로 붙여넣기

로컬 `localhost` 주소는 노션에서 **열리지 않습니다**.

---

## 문제 해결

| 증상 | 해결 |
|------|------|
| `npm` 명령을 찾을 수 없음 | [Node.js](https://nodejs.org) LTS 설치 후 VS Code 재시작 |
| 유튜브만 안 됨 | 링크가 `watch?v=` 형식인지 확인, 일부 영상은 임베드 금지 |
| 화면이 안 바뀜 | 터미널에서 서버 Ctrl+C 후 `npm run dev` 다시 실행 |
