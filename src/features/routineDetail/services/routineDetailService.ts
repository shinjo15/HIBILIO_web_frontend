import {
  toRoutineDetailViewModel,
  type RoutineDetailDto,
  type RoutineDetailViewModel,
} from '../domain/routineDetail';

export type RoutineDetailAdapter = {
  get: (routineId: string) => Promise<unknown>;
};

export type RoutineDetailService = {
  get: (routineId: string) => Promise<RoutineDetailViewModel | null>;
};

export type DummyRoutineDetailMode = 'success' | 'empty' | 'error';

const detailRoutines: RoutineDetailDto[] = [
  {
    author: { handle: 'tanaka_morning', name: '田中 陽介' },
    customizations: 24,
    customizationsList: [
      {
        authorHandle: 'yuki_sleep',
        description: '起床を7:00に変更・筋トレを省略したバージョン',
        id: 'customization-1',
        routineId: 'routine-1',
        title: '夜型アレンジ版',
      },
    ],
    description: '朝6時に起きて、仕事前に集中力を高めるためのルーティンです。読書と軽い運動で脳を覚醒させます。',
    durationMinutes: 65,
    executions: 312,
    executionPosts: [
      {
        achieved: 4,
        avatar: 'Y',
        cheers: 12,
        comment: '読書まで完璧にできた！明日も続けます',
        date: '今日',
        id: 'execution-1',
        minutes: 58,
        routineId: 'routine-1',
        total: 5,
        userHandle: 'yuki_sleep',
        userName: '山田 由紀',
      },
      {
        achieved: 5,
        avatar: 'S',
        cheers: 8,
        comment: '完璧な朝でした',
        date: '昨日',
        id: 'execution-2',
        minutes: 70,
        routineId: 'routine-1',
        total: 5,
        userHandle: 'fitness_masa',
        userName: '佐藤 雅人',
      },
      {
        achieved: 3,
        avatar: 'N',
        cheers: 5,
        date: '2日前',
        id: 'execution-3',
        minutes: 40,
        routineId: 'routine-1',
        total: 5,
        userHandle: 'takumi_wfh',
        userName: '中村 拓海',
      },
    ],
    id: 'routine-1',
    liked: false,
    likes: 148,
    steps: [
      { action: '起床・水を飲む', memo: '常温の水をコップ一杯飲みます。', time: '06:00' },
      { action: 'ストレッチ', duration: '10分', time: '06:10' },
      { action: '読書', duration: '30分', memo: 'スマホは見ずに、前日に決めた本を読みます。', time: '06:20' },
      { action: 'シャワー', duration: '15分', time: '06:50' },
      { action: '朝食', time: '07:05' },
    ],
    tags: ['朝活', '集中力', '習慣'],
    title: '朝の集中ルーティン｜平日版',
  },
  {
    author: { handle: 'yuki_sleep', name: '山田 由紀' },
    customizations: 41,
    customizationsList: [
      {
        authorHandle: 'tanaka_morning',
        description: '入浴を短くして、読書の時間を増やした平日向けのアレンジです。',
        id: 'customization-2',
        routineId: 'routine-2',
        title: '読書を長くする平日版',
      },
    ],
    description: '質の良い睡眠のための入眠準備。スマホを手放してから1時間で自然に眠れるようになりました。',
    durationMinutes: 80,
    executions: 489,
    executionPosts: [
      {
        achieved: 6,
        avatar: 'H',
        cheers: 16,
        comment: 'スマホを置いたら、いつもより早く眠れました。',
        date: '今日',
        id: 'execution-4',
        minutes: 75,
        routineId: 'routine-2',
        total: 6,
        userHandle: 'bookworm_hana',
        userName: '鈴木 花音',
      },
      {
        achieved: 5,
        avatar: 'T',
        cheers: 7,
        date: '昨日',
        id: 'execution-5',
        minutes: 68,
        routineId: 'routine-2',
        total: 6,
        userHandle: 'takumi_wfh',
        userName: '中村 拓海',
      },
    ],
    id: 'routine-2',
    liked: true,
    likes: 231,
    steps: [
      { action: 'スマホを伏せる', time: '21:30' },
      { action: '入浴', duration: '20分', time: '21:35' },
      { action: 'ストレッチ・瞑想', duration: '10分', time: '22:00' },
      { action: '日記を書く', duration: '10分', time: '22:15' },
      { action: '読書（紙の本）', duration: '20分', time: '22:30' },
      { action: '就寝', time: '22:50' },
    ],
    tags: ['睡眠改善', '夜活', '瞑想'],
    title: '夜のリラックスルーティン',
  },
  {
    author: { handle: 'fitness_masa', name: '佐藤 雅人' },
    customizations: 18,
    customizationsList: [],
    description: '自重トレーニングのみ。器具不要で毎日続けられる30分の筋トレです。',
    durationMinutes: 32,
    executions: 204,
    executionPosts: [],
    id: 'routine-3',
    liked: false,
    likes: 89,
    steps: [
      { action: 'ウォームアップ', duration: '5分', time: '07:00' },
      { action: '腕立て伏せ 3セット', duration: '8分', time: '07:05' },
      { action: 'スクワット 3セット', duration: '8分', time: '07:13' },
      { action: 'プランク 3セット', duration: '6分', time: '07:21' },
      { action: 'クールダウン', duration: '5分', time: '07:27' },
    ],
    tags: ['筋トレ', '自重', '健康'],
    title: '初心者向け筋トレルーティン',
  },
  {
    author: { handle: 'bookworm_hana', name: '鈴木 花音' },
    customizations: 9,
    customizationsList: [],
    description: '通勤時間を読書に変えるルーティン。月に5冊読めるようになりました。',
    durationMinutes: 63,
    executions: 133,
    executionPosts: [],
    id: 'routine-4',
    liked: false,
    likes: 64,
    steps: [
      { action: '電車に乗る', time: '07:30' },
      { action: 'Kindleを開く（イヤホンなし）', time: '07:32' },
      { action: '読書終了・メモを取る', duration: '3分', time: '08:02' },
      { action: '帰りも同様に読書', duration: '30分', time: '20:00' },
    ],
    tags: ['読書', '通勤', 'インプット'],
    title: '読書習慣ルーティン｜通勤活用版',
  },
  {
    author: { handle: 'takumi_wfh', name: '中村 拓海' },
    customizations: 33,
    customizationsList: [],
    description: '家で仕事をすると集中できない問題を解決。時間ブロックとポモドーロを組み合わせました。',
    durationMinutes: 80,
    executions: 356,
    executionPosts: [],
    id: 'routine-5',
    liked: false,
    likes: 177,
    steps: [
      { action: '今日のタスクをリスト化', duration: '10分', time: '09:00' },
      { action: 'ポモドーロ 第1ブロック', duration: '25分', time: '09:10' },
      { action: '休憩', duration: '5分', time: '09:35' },
      { action: 'ポモドーロ 第2ブロック', duration: '25分', time: '09:40' },
      { action: 'コーヒーブレイク', duration: '15分', time: '10:05' },
    ],
    tags: ['在宅', '集中', '仕事'],
    title: '在宅勤務の集中ルーティン',
  },
];

const emptyAdapter: RoutineDetailAdapter = { get: async () => null };
const errorAdapter: RoutineDetailAdapter = {
  get: async () => { throw new Error('Dummy routine detail adapter failed'); },
};
const successAdapter: RoutineDetailAdapter = {
  get: async (routineId) => detailRoutines.find((routine) => routine.id === routineId) ?? null,
};

export function createDummyRoutineDetailAdapter(mode: DummyRoutineDetailMode = 'success'): RoutineDetailAdapter {
  if (mode === 'empty') {
    return emptyAdapter;
  }
  if (mode === 'error') {
    return errorAdapter;
  }
  return successAdapter;
}

export function createRoutineDetailService(adapter: RoutineDetailAdapter): RoutineDetailService {
  async function get(routineId: string): Promise<RoutineDetailViewModel | null> {
    const response = await adapter.get(routineId);
    return response === null ? null : toRoutineDetailViewModel(response);
  }

  return { get };
}

function configuredDummyMode(): DummyRoutineDetailMode {
  const mode = import.meta.env.VITE_ROUTINE_DETAIL_MOCK_MODE;
  return mode === 'empty' || mode === 'error' ? mode : 'success';
}

export const routineDetailService = createRoutineDetailService(
  createDummyRoutineDetailAdapter(configuredDummyMode()),
);
