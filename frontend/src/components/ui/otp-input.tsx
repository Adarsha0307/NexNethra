import { useState, useEffect, useId, useRef } from 'react';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';

const CheckIcon = ({ size = 16, strokeWidth = 3, ...props }: { size?: number; strokeWidth?: number } & React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const OTPSuccess = () => {
  return (
    <div className="flex items-center justify-center gap-4 w-full">
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 500, damping: 30 }}
        className="w-16 h-16 bg-green-500 ring-4 ring-green-100 dark:ring-green-900 text-white flex items-center justify-center rounded-full"
      >
        <CheckIcon size={32} strokeWidth={3} />
      </motion.div>
      <motion.p
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="text-green-600 dark:text-green-400 font-semibold text-lg"
      >
        OTP Verified!
      </motion.p>
    </div>
  );
};

const OTPError = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="text-center text-red-500 dark:text-red-400 font-medium mt-2 absolute -bottom-8 w-full"
    >
      Invalid OTP. Please try again.
    </motion.div>
  );
};

const OTPInputBox = ({
  index,
  length,
  idPrefix,
  verifyOTP,
  state,
  stiffness = 700,
  damping = 20,
  y = 10,
  opacity = 0,
}: {
  index: number;
  length: number;
  idPrefix: string;
  verifyOTP: () => void;
  state: 'idle' | 'error' | 'success';
  stiffness?: number;
  damping?: number;
  y?: number;
  opacity?: number;
}) => {
  const animationControls = useAnimationControls();
  const springTransition = {
    type: 'spring' as const,
    stiffness,
    damping,
    delay: index * 0.05,
  };
  const noDelaySpringTransition = {
    type: 'spring' as const,
    stiffness,
    damping,
  };
  const slowSuccessTransition = {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30,
    delay: index * 0.06,
  };

  useEffect(() => {
    animationControls.start({
      opacity: 1,
      y: 0,
      transition: springTransition,
    });
    return () => animationControls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state === 'success') {
      const transitionX = index * 56;
      animationControls.start({
        x: -transitionX,
        transition: slowSuccessTransition,
      });
    }
  }, [state, index, animationControls, slowSuccessTransition]);

  const onFocus = () => {
    animationControls.start({ y: -5, transition: noDelaySpringTransition });
  };

  const onBlur = () => {
    animationControls.start({ y: 0, transition: noDelaySpringTransition });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const { value } = e.target as HTMLInputElement;
    if (e.key === 'Backspace' && !value && index > 0) {
      document.getElementById(`${idPrefix}-${index - 1}`)?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      document.getElementById(`${idPrefix}-${index - 1}`)?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      document.getElementById(`${idPrefix}-${index + 1}`)?.focus();
    }
  };

  const onInput = (e: React.FormEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    const { value } = target;
    if (value.match(/^[0-9]$/)) {
      target.value = value;
      if (index < length - 1) {
        document.getElementById(`${idPrefix}-${index + 1}`)?.focus();
      }
    } else {
      target.value = '';
    }
    verifyOTP();
  };

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().slice(0, length);
    const digits = pastedData.split('').filter((char) => /^[0-9]$/.test(char));

    digits.forEach((digit, i) => {
      const targetIndex = i;
      if (targetIndex < length) {
        const input = document.getElementById(`${idPrefix}-${targetIndex}`) as HTMLInputElement | null;
        if (input) {
          input.value = digit;
        }
      }
    });

    const nextFocusIndex = Math.min(digits.length, length - 1);
    document.getElementById(`${idPrefix}-${nextFocusIndex}`)?.focus();

    setTimeout(verifyOTP, 0);
  };

  return (
    <motion.div
      className={`w-10 h-12 rounded-lg ring-2 ring-transparent focus-within:shadow-inner overflow-hidden transition-all duration-300 ${
        state === 'error'
          ? 'ring-red-400 dark:ring-red-500'
          : state === 'success'
            ? 'ring-green-500'
            : 'focus-within:ring-gray-400 dark:focus-within:ring-gray-500 ring-gray-200 dark:ring-gray-700'
      }`}
      initial={{ opacity, y }}
      animate={animationControls}
    >
      <input
        id={`${idPrefix}-${index}`}
        type="text"
        inputMode="numeric"
        maxLength={1}
        onInput={onInput}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onFocus={onFocus}
        onBlur={onBlur}
        className="w-full h-full text-center text-2xl font-semibold outline-none caret-gray-900 dark:caret-gray-200 bg-gray-100 dark:bg-black dark:text-white"
        disabled={state === 'success'}
      />
    </motion.div>
  );
};

// --- Main Verification Component ---

export function OTPVerification({
  length = 4,
  email,
  title,
  verifyOTP: verifyCode,
  onResend,
  resendCooldown = 60,
  stiffness = 700,
  damping = 20,
  y = 10,
  opacity = 0,
}: {
  length?: number;
  email?: string;
  title?: string;
  verifyOTP: (code: string) => Promise<boolean> | boolean;
  onResend?: () => Promise<void> | void;
  resendCooldown?: number;
  stiffness?: number;
  damping?: number;
  y?: number;
  opacity?: number;
}) {
  const idPrefix = useId();
  const [state, setState] = useState<'idle' | 'error' | 'success'>('idle');
  const [countdown, setCountdown] = useState(resendCooldown);
  const [isResendDisabled, setIsResendDisabled] = useState(true);
  const [resendError, setResendError] = useState('');
  const animationControls = useAnimationControls();
  const verifyingRef = useRef(false);
  const lastCodeRef = useRef('');

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (isResendDisabled) {
      timer = setInterval(() => {
        setCountdown((prevCountdown) => {
          if (prevCountdown <= 1) {
            clearInterval(timer);
            setIsResendDisabled(false);
            return 0;
          }
          return prevCountdown - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isResendDisabled]);

  const getCode = () => {
    let code = '';
    for (let i = 0; i < length; i++) {
      const input = document.getElementById(`${idPrefix}-${i}`) as HTMLInputElement | null;
      if (input) code += input.value;
    }
    return code;
  };

  const verifyOTP = () => {
    const code = getCode();
    if (code.length < length) {
      lastCodeRef.current = '';
      setState('idle');
      return null;
    }
    if (code === lastCodeRef.current && verifyingRef.current) {
      return null;
    }
    lastCodeRef.current = code;
    if (verifyingRef.current) return null;
    verifyingRef.current = true;

    const result = verifyCode(code);
    Promise.resolve(result)
      .then((ok) => {
        verifyingRef.current = false;
        if (ok) {
          setState('success');
        } else {
          errorAnimation();
        }
      })
      .catch(() => {
        verifyingRef.current = false;
        errorAnimation();
      });
    return null;
  };

  const errorAnimation = async () => {
    setState('error');
    await animationControls.start({
      x: [0, 5, -5, 5, -5, 0],
      transition: { duration: 0.3 },
    });
    setTimeout(() => {
      if (getCode().length < length) setState('idle');
    }, 500);
  };

  const handleResend = () => {
    setResendError('');
    const resend = onResend ? Promise.resolve(onResend()) : Promise.resolve();
    resend
      .then(() => {
        setCountdown(resendCooldown);
        setIsResendDisabled(true);
      })
      .catch((err) => {
        setResendError(err?.message || 'Failed to resend code. Please try again.');
      });
  };

  return (
    <div
      className="rounded-3xl p-6 w-full max-w-sm min-h-[340px] flex flex-col shadow-lg dark:shadow-gray-900/50 relative overflow-hidden isolate"
      style={{
        backgroundImage:
          'url(https://cdn.21st.dev/assets/localized/16c55696aea9e60fe904ded95cfa9615f3dd5850411f794c155beb28679fd3a4.gif)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="absolute inset-0 rounded-3xl bg-white/80 dark:bg-[#0b1426]/97 pointer-events-none"></div>

      <div className="relative z-10 flex flex-col flex-1 justify-center">
        {/* Title */}
        <h1 className="text-2xl font-semibold text-center text-gray-900 dark:text-white mb-2">
          {state === 'success' ? 'Verification Successful!' : title || 'Enter Verification Code'}
        </h1>

        <AnimatePresence mode="wait">
          {state === 'success' ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-center"
              style={{ height: '200px' }}
            >
              <OTPSuccess />
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Description */}
              <p className="text-center text-gray-600 dark:text-gray-300 mt-2 mb-6">
                {email ? (
                  <>
                    We've sent a {length}-digit code to
                    <br /> <span className="font-medium text-gray-800 dark:text-gray-100">{email}</span>
                  </>
                ) : (
                  `Enter the ${length}-digit verification code`
                )}
              </p>

              {/* OTP Input Area */}
              <div className="flex flex-col items-center justify-center gap-2 mb-6 relative h-20">
                <motion.div
                  animate={animationControls}
                  className="flex items-center justify-center gap-4"
                >
                  {Array.from({ length }).map((_, index) => (
                    <OTPInputBox
                      key={`${idPrefix}-${index}`}
                      index={index}
                      length={length}
                      idPrefix={idPrefix}
                      verifyOTP={verifyOTP}
                      state={state}
                      stiffness={stiffness}
                      damping={damping}
                      y={y}
                      opacity={opacity}
                    />
                  ))}
                </motion.div>
                <AnimatePresence>
                  {state === 'error' && <OTPError />}
                </AnimatePresence>
              </div>

              {/* Resend Link */}
              <div className="text-center">
                {resendError && <p className="text-red-500 dark:text-red-400 text-sm mb-2">{resendError}</p>}
                <span className="text-gray-600 dark:text-gray-300">
                  Didn't get a code?{' '}
                </span>
                {isResendDisabled ? (
                  <span className="text-gray-500 dark:text-gray-400">
                    Resend in {countdown}s
                  </span>
                ) : (
                  <button
                    onClick={handleResend}
                    className="font-medium text-gray-900 dark:text-white hover:underline focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 rounded"
                  >
                    Click to resend
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default OTPVerification;
