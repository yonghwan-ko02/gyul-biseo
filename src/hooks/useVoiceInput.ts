import { useState, useCallback, useEffect, useRef } from "react";

/**
 * Web Speech API를 활용하여 음성을 텍스트로 변환하는 커스텀 훅
 */
export function useVoiceInput(onResult: (text: string) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  
  // SpeechRecognition 객체 타입 선언 우회
  const recognitionRef = useRef<any>(null);

  // 최신 onResult를 useRef로 캐시하여 useEffect 재실행 방지
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    // 브라우저 지원 여부 확인
    const SpeechRecognition = 
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.interimResults = false; // 최종 결과만 받음
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResultRef.current(transcript);
      setIsRecording(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleRecording = useCallback(() => {
    if (!isSupported) {
      alert("현재 브라우저는 음성 인식을 지원하지 않습니다. (크롬, 사파리 최신 버전을 권장합니다)");
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch (e) {
        console.error("Failed to start recognition:", e);
      }
    }
  }, [isRecording, isSupported]);

  return { isRecording, toggleRecording, isSupported };
}
