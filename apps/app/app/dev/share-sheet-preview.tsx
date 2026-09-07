import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ShareBottomSheetView, type SheetStateT } from '@/components/ShareBottomSheet';

/** QA 케이스 매트릭스 — 상태 × 재시도 여부 조합을 전부 나열한다 */
const PREVIEW_CASES: { label: string; state: SheetStateT; canRetry: boolean }[] = [
  { label: '로딩', state: { status: 'loading' }, canRetry: false },
  {
    label: 'READY',
    state: {
      status: 'ready',
      wishId: 1,
      item: {
        id: 1,
        status: 'READY',
        name: '힙노틱 벤트라 - 알파인스노우',
        price: 849_000,
        currency: 'KRW',
        imageUrl: 'https://picsum.photos/seed/piki/200',
      },
    },
    canRetry: false,
  },
  {
    label: 'READY (긴 상품명)',
    state: {
      status: 'ready',
      wishId: 1,
      item: {
        id: 1,
        status: 'READY',
        name: '[제작/빅사이즈] 이블렛 케이닌 쿨링 리본 뷔스티에 미니원피스 제이스타일 여름 신상 특가',
        price: 1_249_000,
        currency: 'KRW',
        imageUrl: 'https://picsum.photos/seed/piki2/200',
      },
    },
    canRetry: false,
  },
  { label: 'INCOMPLETE', state: { status: 'incomplete', wishId: 1 }, canRetry: false },
  { label: 'FAILED (파싱)', state: { status: 'failed', wishId: 1 }, canRetry: false },
  { label: '성공 폴백 (상세)', state: { status: 'success', wishId: 1 }, canRetry: false },
  { label: '성공 폴백 (목록)', state: { status: 'success' }, canRetry: false },
  {
    label: '로그인 유도',
    state: { status: 'error', reason: 'unauthenticated', retryable: false },
    canRetry: false,
  },
  {
    label: '세션 만료',
    state: { status: 'error', reason: 'sessionExpired', retryable: false },
    canRetry: false,
  },
  {
    label: '네트워크 (재시도 가능)',
    state: { status: 'error', reason: 'network', retryable: true },
    canRetry: true,
  },
  {
    label: '서버 오류 (재시도 소진)',
    state: { status: 'error', reason: 'server', retryable: true },
    canRetry: false,
  },
  {
    label: '링크 없음 (재시도 불가)',
    state: { status: 'error', reason: 'server', retryable: false },
    canRetry: false,
  },
];

/** 버튼 동작은 실제 이동 대신 목적지를 Alert 로 보여준다 */
const notify = (action: string) => Alert.alert('dev preview', action);

export default function ShareSheetPreview() {
  if (!__DEV__) return <Redirect href="/" />;

  return (
    <SafeAreaProvider>
      <ShareSheetPreviewContent />
    </SafeAreaProvider>
  );
}

function ShareSheetPreviewContent() {
  const { top } = useSafeAreaInsets();
  const [caseIndex, setCaseIndex] = useState(0);
  const current = PREVIEW_CASES[caseIndex];

  return (
    <View style={styles.screen}>
      <View style={[styles.picker, { paddingTop: top + 8 }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {PREVIEW_CASES.map((previewCase, index) => (
            <Pressable
              key={previewCase.label}
              style={[styles.chip, index === caseIndex && styles.chipActive]}
              onPress={() => setCaseIndex(index)}
            >
              <Text style={[styles.chipText, index === caseIndex && styles.chipTextActive]}>
                {previewCase.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ShareBottomSheetView
        state={current.state}
        canRetry={current.canRetry}
        onClose={() => notify('close()')}
        onRetry={() => notify('다시 시도 (retryCount + 1)')}
        onOpenLogin={() => notify('openHostApp → /login')}
        onOpenWishlist={() => notify('openHostApp → /archive/wish (목록)')}
        onOpenWishEdit={wishId => notify(`openHostApp → /archive/wish/${wishId} (상세)`)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    /** 시트 뒤 딤과 구분되도록 시안 목업과 비슷한 밝은 배경 */
    backgroundColor: '#C7CAD1',
  },
  picker: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  chips: {
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  chipActive: {
    backgroundColor: '#191B1F',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2D3037',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
});
