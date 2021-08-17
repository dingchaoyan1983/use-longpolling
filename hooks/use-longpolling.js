import {
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { isFunction, flow } from 'lodash/fp';

export default ({
  mountPulling = true,
  action,
  timeout = 3000,
  payloadGenerator = () => ({}),
  stopPullingCondition = () => false,
  props,
}) => {
  const cleanUpRef = useRef(false);
  const propsRef = useRef(props);
  const timeoutRef = useRef(null);
  const mountedRef = useRef(false);
  const lockingRef = useRef(false);
  useEffect(() => {
    propsRef.current = props;
  });

  const invokeAction = useCallback(() => {
    const _props = propsRef.current;
    const stoped = isFunction(stopPullingCondition) ? stopPullingCondition(_props) : !!stopPullingCondition;
    let pullPromise = Promise.resolve();
    if (!stoped) {
      pullPromise = Promise.resolve(flow(
        payloadGenerator,
        action,
      )(_props));
    }
    return pullPromise;
  }, [action, payloadGenerator, stopPullingCondition]);

  const pulling = useCallback(() => {
    let pullPromise = Promise.resolve();
    if (mountPulling) {
      pullPromise = invokeAction();
    } else if (mountedRef.current) {
      pullPromise = invokeAction();
    }
    const repulling = () => {
      pulling();
      lockingRef.current = false;
    };
    timeoutRef.current = global.setTimeout(() => {
      lockingRef.current = true;
      pullPromise.then(repulling).catch(repulling);
    }, timeout);
    if (cleanUpRef.current) {
      global.clearTimeout(timeoutRef.current);
    }
  }, [invokeAction, timeout, mountPulling]);

  const cleanup = useCallback(() => {
    cleanUpRef.current = true;
    global.clearTimeout(timeoutRef.current);
  }, []);

  useEffect(() => {
    pulling();
    mountedRef.current = true;
    return cleanup;
  }, [pulling, cleanup]);

  const onManualPulling = useCallback(() => {
    if (!lockingRef.current) {
      global.clearTimeout(timeoutRef.current);
      pulling();
    }
  }, [pulling]);

  return {
    onManualPulling,
  };
};
