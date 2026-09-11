import LoginRequired from '@/components/common/login-required';
import { LOGIN_REQUIRED_TITLE } from '@/components/common/login-required/loginRequired.const';
import { ROUTES } from '@/consts/route';
import { getRoleOrRedirect } from '@/utils/getRoleOrRedirect';

type WishArchiveLayoutProps = {
  children: React.ReactNode;
};

async function WishArchiveLayout({ children }: WishArchiveLayoutProps) {
  const role = await getRoleOrRedirect();

  /** 위시 페이지는 멤버가 아니면 로그인 유도 화면을 렌더 */
  if (role !== 'MEMBER')
    return <LoginRequired title={LOGIN_REQUIRED_TITLE.WISH} redirectPath={ROUTES.WISHLIST} />;

  return children;
}

export default WishArchiveLayout;
