# 텍스트 투 테이블 (Text to Table) - Figma 플러그인

![Figma](https://img.shields.io/badge/Figma-F24E1E?style=flat-square&logo=figma&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![MIT License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)

텍스트 데이터를 아름다운 테이블로 변환하는 Figma/FigJam 플러그인입니다. CSV, TSV, 표 형태의 텍스트를 붙여넣기만 하면 자동으로 스타일링된 테이블이 생성됩니다.

## 주요 기능

### 다양한 데이터 형식 지원

- **CSV** (쉼표로 구분된 값)
- **TSV** (탭으로 구분된 값)
- **파이프(|)** 구분자
- **세미콜론(;)** 구분자
- **커스텀 구분자** 지원

### 4가지 테이블 스타일

- **기본(Default)**: 깔끔한 회색 헤더와 테두리
- **미니멀(Minimal)**: 테두리 최소화, 헤더만 구분선
- **굵은 헤더(Bold)**: 진한 회색 헤더, 교대 행 색상
- **컬러(Colored)**: 파란색 테마, 시각적으로 돋보이는 디자인

### 고급 설정

- **헤더 설정**: 컬럼 헤더, 행 헤더 개별 선택 가능
- **텍스트 정렬**: 좌측, 중앙, 우측 정렬 지원
- **동적 너비**: 텍스트 내용에 따른 자동 컬럼 너비 조정
- **크기 조정**: 테이블 프레임 크기 변경 시 자동 비례 조정

### 유용한 도구

- **리사이즈 기능**: 테이블 크기 변경 후 컬럼 너비 자동 재조정
- **실시간 미리보기**: 설정 변경 즉시 결과 확인
- **에러 처리**: 잘못된 데이터 형식에 대한 친화적 오류 메시지

## 설치 방법

### Figma Community에서 설치 (권장)

1. [Figma Community 페이지](링크-추후-업데이트) 방문
2. "Install" 버튼 클릭
3. Figma/FigJam에서 플러그인 메뉴에서 "텍스트 투 테이블" 선택

### 개발자 모드로 설치

1. 이 저장소를 클론합니다:

   ```bash
   git clone https://github.com/JiHoon0422/table-to-text-2.git
   cd table-to-text-2
   ```

2. 의존성을 설치합니다:

   ```bash
   npm install
   ```

3. TypeScript를 컴파일합니다:

   ```bash
   npm run build
   ```

4. Figma에서 플러그인을 가져옵니다:
   - Figma → Plugins → Development → Import plugin from manifest
   - `manifest.json` 파일 선택

## 사용법

### 기본 사용법

1. **플러그인 실행**: Figma/FigJam에서 `Plugins > 텍스트 투 테이블` 선택
2. **데이터 입력**: 텍스트 상자에 표 데이터를 붙여넣기
3. **설정 조정**: 구분자, 헤더, 스타일 등을 선택
4. **테이블 생성**: "테이블 생성" 버튼 클릭

### 지원하는 데이터 형식 예시

#### CSV 형식

```
이름,나이,직업
김철수,25,개발자
이영희,30,디자이너
박민수,28,기획자
```

#### 파이프 구분자

```
제품명|가격|재고
노트북|1200000|15
마우스|25000|50
키보드|80000|30
```

#### TSV 형식 (탭 구분)

```
지역	매출	성장률
서울	5000	12%
부산	3000	8%
대구	2000	15%
```

### 고급 기능

#### 테이블 크기 조정

1. 생성된 테이블 선택
2. 프레임 크기를 원하는 크기로 변경
3. 우클릭 → "Adjust Table Width" 선택
4. 컬럼 너비가 자동으로 재조정됩니다

#### 정렬 설정

- 각 컬럼별로 개별 정렬 설정 가능
- 좌측 정렬: 일반 텍스트
- 중앙 정렬: 제목, 상태 등
- 우측 정렬: 숫자, 통계 등

## 개발

### 프로젝트 구조

```
table-to-text-2/
├── code.ts          # 메인 플러그인 로직 (TypeScript)
├── ui.html          # 사용자 인터페이스
├── manifest.json    # 플러그인 설정
├── tsconfig.json    # TypeScript 설정
├── package.json     # 프로젝트 의존성
└── README.md        # 프로젝트 문서
```

### 개발 환경 설정

```bash
# 저장소 클론
git clone https://github.com/JiHoon0422/table-to-text-2.git
cd table-to-text-2

# 의존성 설치
npm install

# TypeScript 컴파일 (개발 모드)
npm run dev

# 프로덕션 빌드
npm run build

# 타입 체크
npm run type-check
```

### 스크립트 명령어

- `npm run build`: TypeScript 컴파일
- `npm run dev`: 개발 모드 (파일 변경 감지)
- `npm run type-check`: 타입 검사만 실행

## 기술 스택

- **TypeScript**: 타입 안전성과 개발 생산성
- **Figma Plugin API**: 네이티브 Figma 통합
- **HTML/CSS/JavaScript**: 사용자 인터페이스
- **Auto Layout**: 반응형 테이블 구조

## 기여하기

기여를 환영합니다! 다음과 같은 방법으로 참여할 수 있습니다:

1. **이슈 리포트**: 버그나 개선사항을 [Issues](https://github.com/JiHoon0422/table-to-text-2/issues)에 등록
2. **기능 제안**: 새로운 기능에 대한 아이디어 공유
3. **코드 기여**: Pull Request를 통한 직접적인 코드 기여

### Pull Request 가이드라인

1. 저장소를 포크합니다
2. 새로운 브랜치를 생성합니다 (`git checkout -b feature/amazing-feature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add amazing feature'`)
4. 브랜치에 푸시합니다 (`git push origin feature/amazing-feature`)
5. Pull Request를 생성합니다

## 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 관련 링크

- [Figma Community 페이지](링크-추후-업데이트)
- [Figma Plugin API 문서](https://www.figma.com/plugin-docs/)
- [이슈 트래커](https://github.com/JiHoon0422/table-to-text-2/issues)

## 지원

문제가 발생하거나 질문이 있으시면:

- GitHub Issues를 통해 문의
- 이메일: ljh62044217@gmail.com

---
