import { useState, useCallback, useEffect, useRef } from "react";

/**
 * Web Speech API를 활용하여 음성을 텍스트로 변환하는 커스텀 훅
 */
export function useVoiceInput(onResult: (text: string) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // 최신 onResult를 useRef로 캐시하여 useEffect 재실행 방지
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const isSecure = typeof window !== "undefined" ? window.isSecureContext : true;
      
    if (!SpeechRecognition || !isSecure) {
      setIsSupported(false);
    }
  }, []);

  const startRecording = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("현재 브라우저는 음성 인식을 지원하지 않습니다.");
      return;
    }

    if (typeof window !== "undefined" && !window.isSecureContext) {
      alert(
        "보안 연결(HTTPS) 환경이 아닙니다. 모바일 사파리 등 모바일 기기에서는 안전하지 않은 연결(HTTP)에서 음성 인식을 지원하지 않습니다. 로컬 테스트 시 HTTPS를 적용해 주십시오."
      );
      return;
    }

    // 기존 세션이 있다면 중단
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        console.error("Failed to abort existing recognition:", e);
      }
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "ko-KR";
      recognition.interimResults = false; // 최종 결과만 받음
      recognition.maxAlternatives = 1;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onResultRef.current(transcript);
        setIsRecording(false);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);

        // 사용자에게 오류 안내 제공
        if (event.error === "not-allowed") {
          alert("마이크 사용 권한이 거부되었습니다. 브라우저 설정에서 마이크 사용 권한을 허용해 주십시오.");
        } else if (event.error === "service-not-allowed") {
          alert("음성 인식 서비스가 거부되었습니다. Siri 활성화 여부나 기기 설정을 확인해 주십시오.");
        } else if (event.error === "no-speech") {
          // 인식된 음성이 없는 경우는 얼럿 없이 종료
        } else {
          alert(`음성 인식 중 오류가 발생했습니다: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
    } catch (e) {
      console.error("Failed to start recognition:", e);
      setIsRecording(false);
      alert("음성 인식을 시작하지 못했습니다. 브라우저 설정을 확인해 주십시오.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error("Failed to stop recognition:", e);
      }
      setIsRecording(false);
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (!isSupported) {
      const isSecure = typeof window !== "undefined" ? window.isSecureContext : true;
      if (!isSecure) {
        alert(
          "보안 연결(HTTPS) 환경이 아니어서 음성 인식을 시작할 수 없습니다. 모바일 기기에서는 안전하지 않은 연결(HTTP)에서 마이크 권한과 음성 인식이 제한됩니다. 로컬 테스트를 위해선 HTTPS 환경으로 접속해 주시기 바랍니다."
        );
      } else {
        alert("현재 브라우저는 음성 인식을 지원하지 않습니다. (크롬, 사파리 최신 버전을 권장합니다)");
      }
      return;
    }

    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, isSupported, startRecording, stopRecording]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  return { isRecording, toggleRecording, isSupported };
}

