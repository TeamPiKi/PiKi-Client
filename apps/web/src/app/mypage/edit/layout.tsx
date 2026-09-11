import LoginRequired from '@/components/common/login-required';
import { LOGIN_REQUIRED_TITLE } from '@/components/common/login-required/loginRequired.const';
import { ROUTES } from '@/consts/route';
import { getRoleOrRedirect } from '@/utils/getRoleOrRedirect';

type MypageEditLayoutProps = {
  children: React.ReactNode;
};

async function MypageEditLayout({ children }: MypageEditLayoutProps) {
  const role = await getRoleOrRedirect();

  // TODO: 멤버 아닌 경우 마이페이지로 리다이렉트되도록 변경 필요
  if (role !== 'MEMBER')
    return (
      <LoginRequired title={LOGIN_REQUIRED_TITLE.MYPAGE_EDIT} redirectPath={ROUTES.MYPAGE_EDIT} />
    );

  return children;
}

export default MypageEditLayout;
