import {
  routineListSchema,
  sortRoutines,
  type Routine,
  type RoutineFeedTab,
} from '../domain/routine';

export type RoutineFeedAdapter = {
  list: () => Promise<unknown>;
};

export type RoutineFeedService = {
  list: (tab?: RoutineFeedTab) => Promise<Routine[]>;
};

export type DummyRoutineFeedMode = 'success' | 'empty' | 'error';

const dummyRoutines: Routine[] = [
  {
    author: { handle: 'tanaka_morning', name: '田中 陽介' },
    createdAt: '2026-09-04T00:00:00.000Z',
    customizations: 24,
    description: '朝の時間を整えて、仕事前の集中力を高めるルーティンです。',
    durationMinutes: 65,
    executions: 312,
    id: 'routine-1',
    liked: false,
    likes: 148,
    steps: [
      { action: '起床・水を飲む', time: '06:00' },
      { action: 'ストレッチ', duration: '10分', time: '06:10' },
      { action: '読書', duration: '30分', time: '06:20' },
      { action: 'シャワー', duration: '15分', time: '06:50' },
    ],
    tags: ['朝活', '集中力', '習慣'],
    title: '朝の集中ルーティン｜平日版',
  },
  {
    author: { handle: 'yuki_sleep', name: '山田 由紀' },
    createdAt: '2026-09-03T12:30:00.000Z',
    customizations: 41,
    description: 'スマホを手放してから、ゆっくり眠りに向かう夜の準備です。',
    durationMinutes: 80,
    executions: 489,
    id: 'routine-2',
    liked: true,
    likes: 231,
    steps: [
      { action: 'スマホを伏せる', time: '21:30' },
      { action: '入浴', duration: '20分', time: '21:35' },
      { action: 'ストレッチ・瞑想', duration: '10分', time: '22:00' },
      { action: '日記を書く', duration: '10分', time: '22:15' },
    ],
    tags: ['睡眠改善', '夜活', '瞑想'],
    title: '夜のリラックスルーティン',
  },
  {
    author: { handle: 'fitness_masa', name: '佐藤 雅人' },
    createdAt: '2026-09-01T08:00:00.000Z',
    customizations: 18,
    description: '器具なしで毎日続けられる、初心者向けの自重トレーニングです。',
    durationMinutes: 32,
    executions: 204,
    id: 'routine-3',
    liked: false,
    likes: 89,
    steps: [
      { action: 'ウォームアップ', duration: '5分', time: '07:00' },
      { action: '腕立て伏せ 3セット', duration: '8分', time: '07:05' },
      { action: 'スクワット 3セット', duration: '8分', time: '07:13' },
      { action: 'プランク 3セット', duration: '6分', time: '07:21' },
    ],
    tags: ['筋トレ', '自重', '健康'],
    title: '初心者向け筋トレルーティン',
  },
  {
    author: { handle: 'bookworm_hana', name: '鈴木 花音' },
    createdAt: '2026-08-30T22:00:00.000Z',
    customizations: 9,
    description: '通勤時間を読書に変えて、毎日のインプットを習慣にします。',
    durationMinutes: 63,
    executions: 133,
    id: 'routine-4',
    liked: false,
    likes: 64,
    steps: [
      { action: '電車に乗る', time: '07:30' },
      { action: 'Kindleを開く', time: '07:32' },
      { action: '読書終了・メモを取る', duration: '3分', time: '08:02' },
      { action: '帰りも同様に読書', duration: '30分', time: '20:00' },
    ],
    tags: ['読書', '通勤', 'インプット'],
    title: '読書習慣ルーティン｜通勤活用版',
  },
  {
    author: { handle: 'takumi_wfh', name: '中村 拓海' },
    createdAt: '2026-08-28T00:00:00.000Z',
    customizations: 33,
    description: '時間ブロックとポモドーロで、在宅勤務の集中時間をつくります。',
    durationMinutes: 80,
    executions: 356,
    id: 'routine-5',
    liked: false,
    likes: 177,
    steps: [
      { action: '今日のタスクをリスト化', duration: '10分', time: '09:00' },
      { action: 'ポモドーロ 第1ブロック', duration: '25分', time: '09:10' },
      { action: '休憩', duration: '5分', time: '09:35' },
      { action: 'ポモドーロ 第2ブロック', duration: '25分', time: '09:40' },
    ],
    tags: ['在宅', '集中', '仕事'],
    title: '在宅勤務の集中ルーティン',
  },
];

const emptyDummyRoutineFeedAdapter: RoutineFeedAdapter = { list: async () => [] };
const errorDummyRoutineFeedAdapter: RoutineFeedAdapter = {
  list: async () => { throw new Error('Dummy routine feed adapter failed'); },
};
const successDummyRoutineFeedAdapter: RoutineFeedAdapter = { list: async () => dummyRoutines };

export function createDummyRoutineFeedAdapter(mode: DummyRoutineFeedMode = 'success'): RoutineFeedAdapter {
  if (mode === 'empty') {
    return emptyDummyRoutineFeedAdapter;
  }
  if (mode === 'error') {
    return errorDummyRoutineFeedAdapter;
  }
  return successDummyRoutineFeedAdapter;
}

export function createRoutineFeedService(adapter: RoutineFeedAdapter): RoutineFeedService {
  async function list(tab: RoutineFeedTab = 'recommended'): Promise<Routine[]> {
    const response = await adapter.list();
    return sortRoutines(routineListSchema.parse(response), tab);
  }

  return {
    list,
  };
}

function configuredDummyMode(): DummyRoutineFeedMode {
  const mode = import.meta.env.VITE_ROUTINE_FEED_MOCK_MODE;
  return mode === 'empty' || mode === 'error' ? mode : 'success';
}

export const routineFeedService = createRoutineFeedService(
  createDummyRoutineFeedAdapter(configuredDummyMode()),
);
