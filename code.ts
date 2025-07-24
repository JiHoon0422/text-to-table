// 피그마 플러그인 메인 코드 - TypeScript 버전

// --- 전역 선언 ---
// Figma 플러그인 타입들은 이미 정의되어 있음

// --- 타입 정의 ---
type TableStyle = "default" | "minimal" | "bold" | "colored";
type TextAlignment = "LEFT" | "CENTER" | "RIGHT";
type FieldType = "text" | "select" | "date";
type MessageType =
  | "create-table"
  | "cancel"
  | "close"
  | "table-created"
  | "error";

interface TableConfig {
  data: string[][];
  hasColumnHeader: boolean;
  hasRowHeader: boolean;
  style: TableStyle;
  delimiter?: string;
  alignments?: TextAlignment[];
  fieldTypes?: FieldType[];
}

interface UIMessage {
  type: MessageType;
  config?: TableConfig;
  tableInfo?: {
    rows: number;
    cols: number;
    hasColumnHeader: boolean;
    hasRowHeader: boolean;
  };
  message?: string;
}

interface TableColors {
  white: RGB;
  lightGray: RGB;
  mediumGray: RGB;
  darkGray: RGB;
  blue: RGB;
  lightBlue: RGB;
  text: RGB;
  headerText: RGB;
}

interface CellReference {
  frame: FrameNode;
  text: TextNode;
  row: number;
  col: number;
}

// Frame 기반 테이블의 셀 인터페이스
interface CustomTableCell {
  text: any;
  fills: readonly Paint[];
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  topBorder: Paint | null;
  bottomBorder: Paint | null;
  leftBorder: Paint | null;
  rightBorder: Paint | null;
}

interface CustomTableObject {
  container?: FrameNode;
  cells: CellReference[][];
  width: number;
  height: number;
  cellAt(row: number, col: number): CustomTableCell | null;
}

// --- 설정 상수 ---
const UI_WIDTH = 600;
const UI_HEIGHT = 600;

const FONT_REGULAR: FontName = { family: "Pretendard", style: "Regular" };
const FONT_MEDIUM: FontName = { family: "Pretendard", style: "Medium" };

const FONT_SIZE_BODY = 16;
const FONT_SIZE_HEADER = 16; // Bold, Colored 스타일에서 사용

const CELL_HEIGHT = 48;
const PADDING_VERTICAL = 12;
const PADDING_HORIZONTAL = 12;
const LINE_HEIGHT = 24;
const MIN_CELL_WIDTH = 80;

// 플러그인 시작점
if (figma.command === "paste-data" || !figma.command) {
  // 메뉴에서 실행된 경우 또는 기본 실행
  figma.showUI(__html__, {
    width: UI_WIDTH,
    height: UI_HEIGHT,
    title: "Text To Table (T2T)",
  });
} else if (figma.command === "resize") {
  resizeTable()
    .then(() => {
      figma.closePlugin("Table resized successfully!");
    })
    .catch((err: Error) => {
      figma.closePlugin("Error resizing table: " + err.message);
    });
}

// UI 메시지 핸들러
figma.ui.onmessage = (msg: UIMessage): void => {
  const { type, config } = msg;

  try {
    switch (type) {
      case "create-table":
        if (config) {
          createTableFromData(config).catch((error: Error) => {
            handleError(error);
          });
        }
        break;

      case "cancel":
      case "close":
        figma.closePlugin();
        break;

      default:
        console.warn("알 수 없는 메시지 타입:", type);
    }
  } catch (error) {
    handleError(error as Error);
  }
};

/**
 * Chevron Down SVG 아이콘 생성 (SelectField용)
 */
function createChevronDownIcon(): SceneNode {
  const chevronSvg = `
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 6L8 10L12 6" stroke="#666666" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;

  const icon = figma.createNodeFromSvg(chevronSvg);
  icon.name = "chevron-down";
  return icon;
}

/**
 * Calendar SVG 아이콘 생성 (DateField용)
 */
function createCalendarIcon(): SceneNode {
  const calendarSvg = `
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="3" width="12" height="12" rx="2" stroke="#666666" stroke-width="1" fill="none"/>
      <line x1="5" y1="1" x2="5" y2="4" stroke="#666666" stroke-width="1" stroke-linecap="round"/>
      <line x1="11" y1="1" x2="11" y2="4" stroke="#666666" stroke-width="1" stroke-linecap="round"/>
      <line x1="2" y1="7" x2="14" y2="7" stroke="#666666" stroke-width="1"/>
    </svg>
  `;

  const icon = figma.createNodeFromSvg(calendarSvg);
  icon.name = "calendar";
  return icon;
}

/**
 * 데이터로부터 피그마 테이블 생성
 */
async function createTableFromData(config: TableConfig): Promise<void> {
  try {
    const { data, hasColumnHeader, hasRowHeader, style, alignments } = config;

    // 입력 검증
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error("유효한 데이터가 제공되지 않았습니다.");
    }

    // 테이블 크기 계산
    const totalRows = data.length;
    const totalCols = data[0]?.length || 0;

    if (totalCols === 0) {
      throw new Error("테이블에 컬럼이 없습니다.");
    }

    // 기본 폰트 로드
    await Promise.all([
      figma.loadFontAsync(FONT_REGULAR),
      figma.loadFontAsync(FONT_MEDIUM),
    ]);

    let table: CustomTableObject | TableNode;

    // 테이블 생성 (환경에 따라 다른 방식 사용)
    if (typeof figma.createTable === "function") {
      // FigJam에서는 네이티브 테이블 API 사용
      table = figma.createTable(totalRows, totalCols);
    } else {
      // 일반 Figma에서는 Frame 기반 테이블 동적 생성
      const columnWidths = await calculateColumnWidths(
        data,
        hasColumnHeader,
        hasRowHeader
      );
      table = createTableWithFrames(data, columnWidths);
    }

    // 데이터 채우기
    await populateTableData(
      table,
      data,
      hasColumnHeader,
      hasRowHeader,
      alignments,
      config.fieldTypes
    );

    // 스타일 적용
    await applyTableStyle(
      table,
      style,
      hasColumnHeader,
      hasRowHeader,
      totalRows,
      totalCols
    );

    // 테이블 위치 설정 (현재 뷰포트 중앙)
    const viewport = figma.viewport.center;
    if ("container" in table && table.container) {
      // Frame 기반 테이블
      table.container.x = viewport.x - table.width / 2;
      table.container.y = viewport.y - table.height / 2;
      figma.currentPage.selection = [table.container];
      figma.viewport.scrollAndZoomIntoView([table.container]);
    } else {
      // 네이티브 테이블 (FigJam)
      const nativeTable = table as TableNode;
      nativeTable.x = viewport.x - nativeTable.width / 2;
      nativeTable.y = viewport.y - nativeTable.height / 2;
      figma.currentPage.selection = [nativeTable];
      figma.viewport.scrollAndZoomIntoView([nativeTable]);
    }

    // 성공 메시지 전송
    figma.ui.postMessage({
      type: "table-created",
      tableInfo: {
        rows: totalRows,
        cols: totalCols,
        hasColumnHeader,
        hasRowHeader,
      },
    });

    console.log(`테이블 생성 완료: ${totalRows}행 ${totalCols}열`);
  } catch (error) {
    throw error;
  }
}

/**
 * 동적 너비 계산을 위해 모든 셀의 텍스트 너비를 측정합니다.
 */
async function calculateColumnWidths(
  data: string[][],
  hasColumnHeader: boolean,
  hasRowHeader: boolean
): Promise<number[]> {
  const rows = data.length;
  if (rows === 0) {
    return [];
  }

  const cols = data[0]?.length || 0;
  const columnWidths: number[] = new Array(cols).fill(0);

  // 텍스트 측정을 위한 임시 노드 생성 (단 하나만 생성하여 재사용)
  const tempTextNode = figma.createText();

  try {
    for (let c = 0; c < cols; c++) {
      let maxWidth = 0;
      for (let r = 0; r < rows; r++) {
        const isHeader =
          (hasColumnHeader && r === 0) || (hasRowHeader && c === 0);

        // 폰트와 사이즈를 임시 노드에 적용
        tempTextNode.fontName = isHeader ? FONT_MEDIUM : FONT_REGULAR;
        tempTextNode.fontSize = isHeader ? FONT_SIZE_HEADER : FONT_SIZE_BODY;

        // 텍스트 내용을 설정하고 너비 측정
        const text = String(data[r]?.[c] || "");
        tempTextNode.characters = text;

        if (tempTextNode.width > maxWidth) {
          maxWidth = tempTextNode.width;
        }
      }
      // 좌우 패딩을 더한 최종 너비를 저장하고 최소 너비를 보장
      const calculatedWidth = maxWidth + PADDING_HORIZONTAL * 2;
      columnWidths[c] = Math.max(calculatedWidth, MIN_CELL_WIDTH);
    }
  } finally {
    // 측정이 끝나면 임시 노드 제거
    tempTextNode.remove();
  }

  return columnWidths;
}

/**
 * Frame 기반 테이블 생성 (일반 Figma용) - 동적 너비 적용
 */
function createTableWithFrames(
  data: string[][],
  columnWidths: number[]
): CustomTableObject {
  const rows = data.length;
  const cols = columnWidths.length;
  const totalTableWidth = columnWidths.reduce((sum, width) => sum + width, 0);

  // 메인 테이블 컨테이너
  const tableContainer = figma.createFrame();
  tableContainer.name = "Table";
  tableContainer.layoutMode = "VERTICAL";
  tableContainer.itemSpacing = 0;
  tableContainer.paddingLeft = 0;
  tableContainer.paddingRight = 0;
  tableContainer.paddingTop = 0;
  tableContainer.paddingBottom = 0;
  tableContainer.fills = [];
  tableContainer.clipsContent = false;
  tableContainer.resize(totalTableWidth, CELL_HEIGHT * rows);

  // 테이블 데이터 저장용
  const cells: CellReference[][] = [];

  // 행 생성
  for (let row = 0; row < rows; row++) {
    const rowFrame = figma.createFrame();
    rowFrame.name = `Row ${row + 1}`;
    rowFrame.layoutMode = "HORIZONTAL";
    rowFrame.itemSpacing = 0;
    rowFrame.paddingLeft = 0;
    rowFrame.paddingRight = 0;
    rowFrame.paddingTop = 0;
    rowFrame.paddingBottom = 0;
    rowFrame.fills = [];

    // 너비를 부모에 맞게 자동으로 조절하도록 설정
    rowFrame.layoutAlign = "STRETCH";
    rowFrame.counterAxisSizingMode = "AUTO"; // 높이는 내용(셀)에 맞춤

    const rowCells: CellReference[] = [];

    // 열 생성
    for (let col = 0; col < cols; col++) {
      const cellWidth = columnWidths[col];
      const cellFrame = figma.createFrame();
      cellFrame.name = `Cell ${row},${col}`;

      cellFrame.layoutMode = "VERTICAL";
      cellFrame.counterAxisSizingMode = "FIXED"; // 셀의 너비 고정
      cellFrame.primaryAxisSizingMode = "AUTO"; // 높이 Hug
      cellFrame.resize(cellWidth, cellFrame.height); // 셀의 너비를 열 너비로 고정

      cellFrame.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
      cellFrame.strokes = [
        { type: "SOLID", color: { r: 0.9, g: 0.91, b: 0.92 } },
      ];
      cellFrame.strokeWeight = 1;
      cellFrame.primaryAxisAlignItems = "CENTER";
      cellFrame.counterAxisAlignItems = "MIN";
      cellFrame.paddingLeft = PADDING_HORIZONTAL;
      cellFrame.paddingRight = PADDING_HORIZONTAL;
      cellFrame.paddingTop = PADDING_VERTICAL;
      cellFrame.paddingBottom = PADDING_VERTICAL;

      // 텍스트 노드 생성
      const textNode = figma.createText();
      textNode.fontName = FONT_REGULAR;
      textNode.characters = "";
      textNode.fontSize = FONT_SIZE_BODY;
      textNode.fills = [{ type: "SOLID", color: { r: 0.1, g: 0.1, b: 0.1 } }];
      textNode.textAlignVertical = "TOP";
      textNode.lineHeight = {
        unit: "PIXELS",
        value: CELL_HEIGHT - PADDING_VERTICAL * 2,
      };
      textNode.layoutAlign = "INHERIT";
      textNode.textAutoResize = "WIDTH_AND_HEIGHT";

      // 텍스트를 셀에 추가
      cellFrame.appendChild(textNode);
      rowFrame.appendChild(cellFrame);

      // 셀 참조 저장
      rowCells.push({
        frame: cellFrame,
        text: textNode,
        row,
        col,
      });
    }

    cells.push(rowCells);
    tableContainer.appendChild(rowFrame);
  }

  // 메타데이터 및 Relaunch 버튼 설정
  try {
    tableContainer.setPluginData("columnWidths", JSON.stringify(columnWidths));
    tableContainer.setRelaunchData({
      resize: "Adjust column widths to the new frame size.",
    });
  } catch (e) {
    console.error("Failed to set plugin data or relaunch data", e);
  }

  // 테이블 객체 반환 (TableNode API와 호환되도록)
  const tableObj: any = {
    container: tableContainer,
    cells,
    width: totalTableWidth,
    height: CELL_HEIGHT * rows,

    // TableNode API 호환 메서드
    cellAt(row: number, col: number): CustomTableCell | null {
      if (
        row >= 0 &&
        row < cells.length &&
        col >= 0 &&
        col < cells[row].length
      ) {
        const cell = cells[row][col];
        return {
          text: {
            get characters() {
              return cell.text.characters;
            },
            set characters(value: string) {
              cell.text.characters = value;
            },
            get fontName() {
              return cell.text.fontName as FontName;
            },
            set fontName(value: FontName) {
              cell.text.fontName = value;
            },
            get fontSize() {
              return cell.text.fontSize as number;
            },
            set fontSize(value: number) {
              cell.text.fontSize = value;
            },
            get fills() {
              return cell.text.fills as readonly Paint[];
            },
            set fills(value: readonly Paint[]) {
              cell.text.fills = value;
            },
            get textAlignHorizontal() {
              return cell.text.textAlignHorizontal as any as
                | "LEFT"
                | "CENTER"
                | "RIGHT";
            },
            set textAlignHorizontal(value: "LEFT" | "CENTER" | "RIGHT") {
              (cell.text as any).textAlignHorizontal = value;
            },
          },
          get fills() {
            return cell.frame.fills as readonly Paint[];
          },
          set fills(value: readonly Paint[]) {
            cell.frame.fills = value;
          },
          get paddingTop() {
            return cell.frame.paddingTop;
          },
          set paddingTop(value: number) {
            cell.frame.paddingTop = value;
          },
          get paddingBottom() {
            return cell.frame.paddingBottom;
          },
          set paddingBottom(value: number) {
            cell.frame.paddingBottom = value;
          },
          get paddingLeft() {
            return cell.frame.paddingLeft;
          },
          set paddingLeft(value: number) {
            cell.frame.paddingLeft = value;
          },
          get paddingRight() {
            return cell.frame.paddingRight;
          },
          set paddingRight(value: number) {
            cell.frame.paddingRight = value;
          },
          get topBorder() {
            return null;
          },
          set topBorder(value: Paint | null) {
            /* 구현 생략 */
          },
          get bottomBorder() {
            return null;
          },
          set bottomBorder(value: Paint | null) {
            /* 구현 생략 */
          },
          get leftBorder() {
            return null;
          },
          set leftBorder(value: Paint | null) {
            /* 구현 생략 */
          },
          get rightBorder() {
            return null;
          },
          set rightBorder(value: Paint | null) {
            /* 구현 생략 */
          },
        };
      }
      return null;
    },

    // 위치 설정 메서드
    set x(value: number) {
      if (this.container) this.container.x = value;
    },
    get x() {
      return this.container ? this.container.x : 0;
    },
    set y(value: number) {
      if (this.container) this.container.y = value;
    },
    get y() {
      return this.container ? this.container.y : 0;
    },
  };

  return tableObj;
}

/**
 * 테이블에 데이터 채우기
 */
async function populateTableData(
  table: CustomTableObject | TableNode,
  data: string[][],
  hasColumnHeader: boolean,
  hasRowHeader: boolean,
  alignments?: TextAlignment[],
  fieldTypes?: FieldType[]
): Promise<void> {
  const rows = data.length;
  const cols = data[0]?.length || 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = table.cellAt(row, col);
      if (!cell) continue;

      const cellData = data[row]?.[col] || "";

      // 셀 텍스트 설정
      cell.text.characters = String(cellData);

      // 정렬 설정 적용
      const align = alignments?.[col] || "LEFT";
      (cell.text as any).textAlignHorizontal = align;

      // 헤더 셀 폰트 설정
      const isColumnHeader = hasColumnHeader && row === 0;
      const isRowHeader = hasRowHeader && col === 0;
      const isHeader = isColumnHeader || isRowHeader;

      if (isHeader) {
        cell.text.fontName = FONT_MEDIUM;
        cell.text.fontSize = FONT_SIZE_HEADER;
      } else {
        cell.text.fontName = FONT_REGULAR;
        cell.text.fontSize = FONT_SIZE_BODY;
      }

      // 필드 타입에 따른 아이콘 추가 (Frame 기반 테이블에서만)
      if ("container" in table && fieldTypes && !isHeader) {
        const fieldType = fieldTypes[col] || "text";
        if (fieldType === "select" || fieldType === "date") {
          // CustomTableObject의 경우 실제 셀 프레임에 접근
          const customTable = table as CustomTableObject;
          if (
            customTable.cells &&
            customTable.cells[row] &&
            customTable.cells[row][col]
          ) {
            const cellFrame = customTable.cells[row][col].frame;
            const textNode = customTable.cells[row][col].text;

            // 셀의 원래 너비 저장
            const originalWidth = cellFrame.width;

            // 셀을 수평 레이아웃으로 변경
            cellFrame.layoutMode = "HORIZONTAL";
            cellFrame.counterAxisAlignItems = "CENTER";
            cellFrame.primaryAxisAlignItems = "SPACE_BETWEEN";
            cellFrame.counterAxisSizingMode = "FIXED"; // 너비 고정 유지

            // 텍스트 노드 크기 조절 설정
            textNode.textAutoResize = "HEIGHT"; // 높이만 자동 조절, 너비는 고정
            textNode.layoutAlign = "INHERIT";

            // 아이콘 생성 및 추가
            let icon: SceneNode;
            if (fieldType === "select") {
              icon = createChevronDownIcon();
            } else {
              // fieldType === "date"
              icon = createCalendarIcon();
            }

            // 아이콘 크기 고정 설정
            if ("layoutAlign" in icon) {
              (icon as any).layoutAlign = "INHERIT";
            }
            if ("resize" in icon) {
              (icon as any).resize(16, 16); // 아이콘 크기 고정
            }

            cellFrame.appendChild(icon);

            // 셀의 너비를 원래 너비로 다시 설정
            cellFrame.resize(originalWidth, cellFrame.height);
          }
        }
      }
    }
  }
}

/**
 * 테이블 스타일 적용
 */
async function applyTableStyle(
  table: CustomTableObject | TableNode,
  style: TableStyle,
  hasColumnHeader: boolean,
  hasRowHeader: boolean,
  rows: number,
  cols: number
): Promise<void> {
  // 색상 정의
  const colors: TableColors = {
    white: { r: 1, g: 1, b: 1 },
    lightGray: { r: 0.96, g: 0.96, b: 0.96 },
    mediumGray: { r: 0.9, g: 0.91, b: 0.92 },
    darkGray: { r: 0.4, g: 0.4, b: 0.4 },
    blue: { r: 0.23, g: 0.51, b: 0.96 },
    lightBlue: { r: 0.93, g: 0.96, b: 1 },
    text: { r: 0.1, g: 0.1, b: 0.1 },
    headerText: { r: 0.05, g: 0.05, b: 0.05 },
  };

  // 모든 셀 기본 스타일 적용
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = table.cellAt(row, col);
      if (!cell) continue;

      // 기본 텍스트 스타일
      cell.text.fontSize = FONT_SIZE_BODY;
      cell.text.fills = [{ type: "SOLID", color: colors.text }];

      // 셀 패딩 설정
      if ("paddingTop" in cell) {
        (cell as any).paddingTop = PADDING_VERTICAL;
        (cell as any).paddingBottom = PADDING_VERTICAL;
        (cell as any).paddingLeft = PADDING_HORIZONTAL;
        (cell as any).paddingRight = PADDING_HORIZONTAL;
      }

      // 기본 배경색
      cell.fills = [{ type: "SOLID", color: colors.white }];

      // 테두리 설정
      if ("topBorder" in cell) {
        const borderStyle: Paint = {
          type: "SOLID",
          color: colors.mediumGray,
        };

        (cell as any).topBorder = borderStyle;
        (cell as any).bottomBorder = borderStyle;
        (cell as any).leftBorder = borderStyle;
        (cell as any).rightBorder = borderStyle;
      }
    }
  }

  // 스타일별 적용
  switch (style) {
    case "minimal":
      applyMinimalStyle(
        table,
        colors,
        hasColumnHeader,
        hasRowHeader,
        rows,
        cols
      );
      break;

    case "bold":
      applyBoldStyle(table, colors, hasColumnHeader, hasRowHeader, rows, cols);
      break;

    case "colored":
      applyColoredStyle(
        table,
        colors,
        hasColumnHeader,
        hasRowHeader,
        rows,
        cols
      );
      break;

    default: // 'default'
      applyDefaultStyle(
        table,
        colors,
        hasColumnHeader,
        hasRowHeader,
        rows,
        cols
      );
      break;
  }
}

/**
 * 기본 스타일 적용
 */
function applyDefaultStyle(
  table: CustomTableObject | TableNode,
  colors: TableColors,
  hasColumnHeader: boolean,
  hasRowHeader: boolean,
  rows: number,
  cols: number
): void {
  // 컬럼 헤더 스타일링
  if (hasColumnHeader) {
    for (let col = 0; col < cols; col++) {
      const headerCell = table.cellAt(0, col);
      if (!headerCell) continue;

      headerCell.fills = [
        { type: "SOLID", color: { r: 0.96, g: 0.96, b: 0.96 } },
      ];
      headerCell.text.fills = [{ type: "SOLID", color: colors.headerText }];
    }
  }

  // 행 헤더 스타일링
  if (hasRowHeader) {
    const startRow = hasColumnHeader ? 1 : 0;
    for (let row = startRow; row < rows; row++) {
      const headerCell = table.cellAt(row, 0);
      if (!headerCell) continue;

      headerCell.fills = [
        { type: "SOLID", color: { r: 0.96, g: 0.96, b: 0.96 } },
      ];
      headerCell.text.fills = [{ type: "SOLID", color: colors.headerText }];
    }
  }

  // 교차 헤더 셀 (row header와 column header가 만나는 지점)
  if (hasColumnHeader && hasRowHeader) {
    const cornerCell = table.cellAt(0, 0);
    if (cornerCell) {
      cornerCell.fills = [
        { type: "SOLID", color: { r: 0.96, g: 0.96, b: 0.96 } },
      ];
      cornerCell.text.fills = [{ type: "SOLID", color: colors.headerText }];
    }
  }
}

/**
 * 미니멀 스타일 적용
 */
function applyMinimalStyle(
  table: CustomTableObject | TableNode,
  colors: TableColors,
  hasColumnHeader: boolean,
  hasRowHeader: boolean,
  rows: number,
  cols: number
): void {
  // 모든 테두리 제거
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = table.cellAt(row, col);
      if (!cell) continue;

      // 테두리 제거
      if ("topBorder" in cell) {
        (cell as any).topBorder = null;
        (cell as any).bottomBorder = null;
        (cell as any).leftBorder = null;
        (cell as any).rightBorder = null;
      }

      // 배경 투명하게
      cell.fills = [];
    }
  }

  // 컬럼 헤더 하단에만 테두리
  if (hasColumnHeader) {
    for (let col = 0; col < cols; col++) {
      const headerCell = table.cellAt(0, col);
      if (!headerCell) continue;

      if ("bottomBorder" in headerCell) {
        (headerCell as any).bottomBorder = {
          type: "SOLID",
          color: colors.darkGray,
        };
      }
      headerCell.text.fills = [{ type: "SOLID", color: colors.headerText }];
      headerCell.text.fontSize = FONT_SIZE_HEADER;
    }
  }

  // 행 헤더 우측에만 테두리
  if (hasRowHeader) {
    const startRow = hasColumnHeader ? 1 : 0;
    for (let row = startRow; row < rows; row++) {
      const headerCell = table.cellAt(row, 0);
      if (!headerCell) continue;

      if ("rightBorder" in headerCell) {
        (headerCell as any).rightBorder = {
          type: "SOLID",
          color: colors.darkGray,
        };
      }
      headerCell.text.fills = [{ type: "SOLID", color: colors.headerText }];
      headerCell.text.fontSize = FONT_SIZE_HEADER;
    }
  }

  // 교차 헤더 셀 처리
  if (hasColumnHeader && hasRowHeader) {
    const cornerCell = table.cellAt(0, 0);
    if (cornerCell) {
      if ("bottomBorder" in cornerCell) {
        (cornerCell as any).bottomBorder = {
          type: "SOLID",
          color: colors.darkGray,
        };
        (cornerCell as any).rightBorder = {
          type: "SOLID",
          color: colors.darkGray,
        };
      }
    }
  }
}

/**
 * 굵은 헤더 스타일 적용
 */
function applyBoldStyle(
  table: CustomTableObject | TableNode,
  colors: TableColors,
  hasColumnHeader: boolean,
  hasRowHeader: boolean,
  rows: number,
  cols: number
): void {
  // 컬럼 헤더 강조
  if (hasColumnHeader) {
    for (let col = 0; col < cols; col++) {
      const headerCell = table.cellAt(0, col);
      if (!headerCell) continue;

      headerCell.fills = [{ type: "SOLID", color: colors.darkGray }];
      headerCell.text.fills = [{ type: "SOLID", color: colors.white }];
      headerCell.text.fontSize = FONT_SIZE_HEADER;
    }
  }

  // 행 헤더 강조
  if (hasRowHeader) {
    const startRow = hasColumnHeader ? 1 : 0;
    for (let row = startRow; row < rows; row++) {
      const headerCell = table.cellAt(row, 0);
      if (!headerCell) continue;

      headerCell.fills = [{ type: "SOLID", color: colors.darkGray }];
      headerCell.text.fills = [{ type: "SOLID", color: colors.white }];
      headerCell.text.fontSize = FONT_SIZE_HEADER;
    }
  }

  // 교차 헤더 셀
  if (hasColumnHeader && hasRowHeader) {
    const cornerCell = table.cellAt(0, 0);
    if (cornerCell) {
      cornerCell.fills = [{ type: "SOLID", color: colors.darkGray }];
      cornerCell.text.fills = [{ type: "SOLID", color: colors.white }];
      cornerCell.text.fontSize = FONT_SIZE_HEADER;
    }
  }

  // 데이터 행 교대로 색상 적용
  const dataStartRow = hasColumnHeader ? 1 : 0;
  const dataStartCol = hasRowHeader ? 1 : 0;

  for (let row = dataStartRow; row < rows; row++) {
    if ((row - dataStartRow) % 2 === 1) {
      for (let col = dataStartCol; col < cols; col++) {
        const cell = table.cellAt(row, col);
        if (cell) {
          cell.fills = [{ type: "SOLID", color: colors.lightGray }];
        }
      }
    }
  }
}

/**
 * 컬러 스타일 적용
 */
function applyColoredStyle(
  table: CustomTableObject | TableNode,
  colors: TableColors,
  hasColumnHeader: boolean,
  hasRowHeader: boolean,
  rows: number,
  cols: number
): void {
  // 컬럼 헤더 파란색 테마
  if (hasColumnHeader) {
    for (let col = 0; col < cols; col++) {
      const headerCell = table.cellAt(0, col);
      if (!headerCell) continue;

      headerCell.fills = [{ type: "SOLID", color: colors.blue }];
      headerCell.text.fills = [{ type: "SOLID", color: colors.white }];
      headerCell.text.fontSize = FONT_SIZE_HEADER;
    }
  }

  // 행 헤더 파란색 테마
  if (hasRowHeader) {
    const startRow = hasColumnHeader ? 1 : 0;
    for (let row = startRow; row < rows; row++) {
      const headerCell = table.cellAt(row, 0);
      if (!headerCell) continue;

      headerCell.fills = [{ type: "SOLID", color: colors.blue }];
      headerCell.text.fills = [{ type: "SOLID", color: colors.white }];
      headerCell.text.fontSize = FONT_SIZE_HEADER;
    }
  }

  // 교차 헤더 셀
  if (hasColumnHeader && hasRowHeader) {
    const cornerCell = table.cellAt(0, 0);
    if (cornerCell) {
      cornerCell.fills = [{ type: "SOLID", color: colors.blue }];
      cornerCell.text.fills = [{ type: "SOLID", color: colors.white }];
      cornerCell.text.fontSize = FONT_SIZE_HEADER;
    }
  }

  // 데이터 영역 교대로 색상 적용
  const dataStartRow = hasColumnHeader ? 1 : 0;
  const dataStartCol = hasRowHeader ? 1 : 0;

  for (let row = dataStartRow; row < rows; row++) {
    if ((row - dataStartRow) % 2 === 1) {
      for (let col = dataStartCol; col < cols; col++) {
        const cell = table.cellAt(row, col);
        if (cell) {
          cell.fills = [{ type: "SOLID", color: colors.lightBlue }];
        }
      }
    }
  }
}

/**
 * 오류 처리 함수
 */
function handleError(error: Error): void {
  console.error("[텍스트 투 테이블 플러그인] 오류:", error);

  figma.ui.postMessage({
    type: "error",
    message: `테이블 생성 중 오류가 발생했습니다: ${error.message}`,
  });
}

/**
 * 입력 데이터 검증
 */
function validateTableData(data: string[][]): boolean {
  if (!Array.isArray(data)) {
    throw new Error("데이터는 배열 형태여야 합니다.");
  }

  if (data.length === 0) {
    throw new Error("빈 데이터입니다.");
  }

  if (data.length > 100) {
    throw new Error("테이블 크기가 너무 큽니다. (최대 100행)");
  }

  const firstRowLength = data[0]?.length || 0;
  if (firstRowLength === 0) {
    throw new Error("첫 번째 행에 데이터가 없습니다.");
  }

  if (firstRowLength > 20) {
    throw new Error("컬럼 수가 너무 많습니다. (최대 20열)");
  }

  // 모든 행의 길이가 일치하는지 확인
  const inconsistentRows = data.filter((row) => row.length !== firstRowLength);

  if (inconsistentRows.length > 0) {
    console.warn("일부 행의 컬럼 수가 다릅니다. 자동으로 조정됩니다.");
  }

  return true;
}

/**
 * 선택된 테이블의 너비를 프레임 크기에 맞춰 조정합니다.
 */
async function resizeTable(): Promise<void> {
  const selection = figma.currentPage.selection;
  if (selection.length !== 1) {
    throw new Error("Please select a single table frame.");
  }

  const frame = selection[0];
  if (frame.type !== "FRAME" || !frame.getPluginData("columnWidths")) {
    throw new Error("Selected item is not a compatible table.");
  }

  const originalColumnWidthsJSON = frame.getPluginData("columnWidths");
  const originalColumnWidths: number[] = JSON.parse(originalColumnWidthsJSON);
  const originalTotalWidth = originalColumnWidths.reduce((a, b) => a + b, 0);

  const currentTotalWidth = frame.width;

  if (Math.abs(currentTotalWidth - originalTotalWidth) < 0.01) {
    return; // 너비 변경이 거의 없으면 종료
  }

  // 1. 모든 열을 새 너비에 비례하여 일단 조정
  const ratio = currentTotalWidth / originalTotalWidth;
  let newColumnWidths = originalColumnWidths.map((w) => w * ratio);

  // 2. 최소 너비보다 작아진 열들을 보정하고, 그로 인해 발생한 부족분(deficit) 계산
  let deficit = 0;
  newColumnWidths = newColumnWidths.map((w) => {
    if (w < MIN_CELL_WIDTH) {
      deficit += MIN_CELL_WIDTH - w;
      return MIN_CELL_WIDTH;
    }
    return w;
  });

  // 3. 최소 너비보다 넓은 열들로부터 부족분을 뺌
  let totalRedistributableWidth = 0;
  newColumnWidths.forEach((w) => {
    if (w > MIN_CELL_WIDTH) {
      totalRedistributableWidth += w - MIN_CELL_WIDTH;
    }
  });

  if (totalRedistributableWidth > 0 && deficit > 0) {
    newColumnWidths = newColumnWidths.map((w) => {
      if (w > MIN_CELL_WIDTH) {
        const proportion = (w - MIN_CELL_WIDTH) / totalRedistributableWidth;
        const reduction = deficit * proportion;
        return Math.max(MIN_CELL_WIDTH, w - reduction);
      }
      return w;
    });
  }

  // 4. 부동소수점 계산으로 인한 최종 오차 보정
  const finalSum = newColumnWidths.reduce((a, b) => a + b, 0);
  const adjustment = currentTotalWidth - finalSum;
  if (Math.abs(adjustment) > 0.01) {
    const adjustableCols = newColumnWidths.filter((w) => w > MIN_CELL_WIDTH);
    if (adjustableCols.length > 0) {
      const adjustmentPerCol = adjustment / adjustableCols.length;
      newColumnWidths = newColumnWidths.map((w) => {
        if (w > MIN_CELL_WIDTH) return w + adjustmentPerCol;
        return w;
      });
    }
  }

  // 자식 노드(셀)들의 크기를 조정
  frame.children.forEach((row: any) => {
    if (row.type === "FRAME" && row.layoutMode === "HORIZONTAL") {
      let colIndex = 0;
      row.children.forEach((cell: any) => {
        if (cell.type === "FRAME" && colIndex < newColumnWidths.length) {
          cell.resize(newColumnWidths[colIndex], cell.height);
          colIndex++;
        }
      });
    }
  });

  // 새로운 너비 정보를 메타데이터로 저장
  frame.setPluginData("columnWidths", JSON.stringify(newColumnWidths));
}

// 플러그인 초기화 로그
console.log("텍스트 투 테이블 플러그인이 시작되었습니다.");

// 플러그인 종료 시 정리
figma.on("close", () => {
  console.log("텍스트 투 테이블 플러그인이 종료되었습니다.");
});
