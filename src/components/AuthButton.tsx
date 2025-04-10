'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button, ButtonProps } from '@/components/ui/button';

interface AuthButtonProps extends ButtonProps {
  children: ReactNode;
  redirectTo?: string;
}

export default function AuthButton({
  children,
  redirectTo = '/auth/signin',
  ...props
}: AuthButtonProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };

    checkAuth();
  }, []);

  const handleClick = () => {
    if (!isAuthenticated) {
      router.push(redirectTo);
    }
  };

  // We're still checking auth status
  if (isAuthenticated === null) {
    return (
      <Button disabled {...props}>
        {children}
      </Button>
    );
  }

  return (
    <Button onClick={handleClick} {...props}>
      {children}
    </Button>
  );
}
