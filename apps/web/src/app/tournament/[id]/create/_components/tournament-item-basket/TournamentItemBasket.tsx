import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import AddIcon from '@/assets/icons/fill/add.svg';
import { Dialog, DialogTrigger } from '@/components/dialog';
import GetItemDialogContent from '@/components/get-item-dialog';
import { ITEM_STATUS } from '@/consts/item';
import { ROUTES } from '@/consts/route';
import { useGetMe } from '@/hooks/useGetMe';

import { useGetTournament } from '../../../_common/_hooks/useGetTournament';
import type { PendingTournamentItemT } from '../../../_common/_types/tournamentResponse';
import basketImg from '../../_assets/basket-gray.png';
import { ITEMS_PER_BASKET } from '../../_consts/tournamentItemBasket';
import TournamentBasketItem from './TournamentBasketItem';
import TournamentItemErrorDialogContent from './TournamentItemErrorDialogContent';

type TournamentItemBasketProps = {
  basketIndex: number;
  items: PendingTournamentItemT[];
  maxHeight?: number;
  isAddItemBlocked?: boolean;
  participantImageMap?: Map<string, string>;
};

function TournamentItemBasket({
  basketIndex,
  items,
  maxHeight,
  isAddItemBlocked = false,
  participantImageMap,
}: TournamentItemBasketProps) {
  const { id } = useParams<{ id: string }>();
  const tournamentId = Number(id);

  const { userData } = useGetMe();
  const { tournamentData } = useGetTournament(tournamentId);

  const basketMaxWidth = maxHeight ? (maxHeight * 356) / 464 : null;

  const isFull = items.length >= ITEMS_PER_BASKET;
  const showAddButton = !isAddItemBlocked && !isFull;

  const addSlot = showAddButton ? (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="relative flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-[2.5px] border-white bg-white/1 shadow-[0_0_8px_rgba(0,0,0,0.16)] backdrop-blur-sm"
          aria-label="위시 아이템 추가"
        >
          <AddIcon width={28} height={28} className="text-base-50" aria-hidden />
        </button>
      </DialogTrigger>
      <GetItemDialogContent type="tournament" />
    </Dialog>
  ) : null;

  return (
    <div
      className="relative mx-auto aspect-356/464 w-full max-w-full"
      {...(basketMaxWidth ? { style: { maxWidth: basketMaxWidth } } : {})}
    >
      <Image
        src={basketImg}
        alt={`장바구니 ${basketIndex + 1}`}
        fill
        preload
        sizes="(max-width: 480px) 80vw, 384px"
        className="object-contain"
      />
      <div className="absolute inset-0 flex items-start justify-center">
        {items.length === 0 && showAddButton ? (
          <div className="flex h-full w-[20%] items-center justify-start">{addSlot}</div>
        ) : (
          <div className="grid w-[46.5%] grid-cols-2 gap-3.5 pt-[17%]">
            {addSlot}
            {items.map((item, index) => {
              /** READY 아이템은 누구나 진입 가능 — 주최자·본인이 아니면 조회 전용으로 열림 */
              if (item.status === ITEM_STATUS.READY) {
                return (
                  <Link
                    key={item.tournamentItemId}
                    href={ROUTES.TOURNAMENT_ITEM_EDIT(tournamentId, item.tournamentItemId)}
                  >
                    <TournamentBasketItem
                      item={item}
                      index={index}
                      participantImageMap={participantImageMap}
                    />
                  </Link>
                );
              }

              /** FAILED·INCOMPLETE 아이템은 탭하면 삭제/직접 입력 다이얼로그 — 주최자·본인만 가능 */
              const canEdit = tournamentData.isOwner || item.userId === userData.id;

              if (
                canEdit &&
                (item.status === ITEM_STATUS.FAILED || item.status === ITEM_STATUS.INCOMPLETE)
              ) {
                return (
                  <Dialog key={item.tournamentItemId}>
                    <DialogTrigger asChild>
                      {/* 키보드로도 열 수 있도록 div 타일이 아닌 button 을 트리거로 */}
                      <button
                        type="button"
                        className="block w-full cursor-pointer"
                        aria-label={`토너먼트 아이템 ${index + 1} 삭제 또는 직접 입력`}
                      >
                        <TournamentBasketItem
                          item={item}
                          index={index}
                          participantImageMap={participantImageMap}
                        />
                      </button>
                    </DialogTrigger>
                    <TournamentItemErrorDialogContent
                      status={item.status}
                      tournamentId={tournamentId}
                      tournamentItemId={item.tournamentItemId}
                    />
                  </Dialog>
                );
              }

              return (
                <TournamentBasketItem
                  key={item.tournamentItemId}
                  item={item}
                  index={index}
                  participantImageMap={participantImageMap}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default TournamentItemBasket;
