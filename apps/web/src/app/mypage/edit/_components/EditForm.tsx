'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import BottomCta from '@/components/bottom-cta';
import Button from '@/components/button';
import Spacing from '@/components/spacing';
import { ROUTES } from '@/consts/route';
import { useGetMe } from '@/hooks/useGetMe';
import { useNicknameValidation } from '@/hooks/useNicknameValidation';
import { usePatchMe } from '@/hooks/usePatchMe';

import NicknameField from './NicknameField';
import ProfileImageField from './ProfileImageField';

function EditForm() {
  const router = useRouter();

  const { userData } = useGetMe();
  const { patchMeMutation, isPatchMePending } = usePatchMe();

  const [nickname, setNickname] = useState(userData.nickname);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);

  const {
    isCheckingNickname,
    isNicknameChanged,
    isNicknameValid,
    nicknameErrorText,
    trimmedNickname,
  } = useNicknameValidation(nickname, userData.nickname);

  const hasProfileImageChange = profileImageFile !== null;
  const hasChanges = isNicknameChanged || hasProfileImageChange;
  const isEditDisabled = !hasChanges || !isNicknameValid || isPatchMePending;

  const handleNicknameChange = (value: string) => setNickname(value);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isEditDisabled) return;

    patchMeMutation(
      {
        ...(isNicknameChanged ? { nickname: trimmedNickname } : {}),
        ...(profileImageFile ? { image: profileImageFile } : {}),
      },
      {
        onSuccess: () => {
          router.replace(ROUTES.MYPAGE);
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="hide-scrollbar flex flex-1 flex-col overflow-y-auto pb-bottom-cta">
        <ProfileImageField
          userIdentityType={userData.identityType}
          profileImage={userData.profileImage}
          onImageSelect={setProfileImageFile}
        />

        <Spacing size={29} />

        <NicknameField
          value={nickname}
          onChange={handleNicknameChange}
          isChecking={isCheckingNickname}
          {...(nicknameErrorText ? { errorText: nicknameErrorText } : {})}
        />
      </div>

      <BottomCta>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          isLoading={isPatchMePending}
          disabled={isEditDisabled}
        >
          수정하기
        </Button>
      </BottomCta>
    </form>
  );
}

export default EditForm;
