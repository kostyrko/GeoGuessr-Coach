(() => {
  const BRIDGE_EVENT = 'geoguessr-coach:collector-event';
  const SOURCE = 'daily-challenge-free-leaderboard';
  const ENDPOINT = '/api/v3/challenges/daily-challenges/leaderboard/free';
  const emittedGameTokens = new Set();

  const emit = (message) => {
    window.dispatchEvent(
      new CustomEvent(BRIDGE_EVENT, {
        detail: JSON.stringify(message),
      }),
    );
  };

  const emitLifecycle = (status, reason) => {
    emit({
      occurredAt: new Date().toISOString(),
      reason,
      source: SOURCE,
      status,
      type: 'geoguessr-coach:capture-lifecycle',
    });
  };

  const isCompletedResultVisible = () =>
    document.querySelector('[data-qa="result-view-top"], [data-qa="result-view-bottom"]') !== null;

  const getSignedInUserId = () => {
    const stateNode = document.getElementById('__NEXT_DATA__');
    if (!stateNode?.textContent) {
      return undefined;
    }

    try {
      const state = JSON.parse(stateNode.textContent);
      return (
        state?.props?.pageProps?.account?.user?.userId ??
        state?.props?.accountProps?.account?.user?.userId
      );
    } catch {
      return undefined;
    }
  };

  const isCandidateResponse = (url) => {
    try {
      return new URL(url, window.location.origin).pathname === ENDPOINT;
    } catch {
      return false;
    }
  };

  const createEnvelope = (payload) => {
    if (!isCompletedResultVisible()) {
      emitLifecycle('skipped', 'result-view-not-visible');
      return undefined;
    }

    const userId = getSignedInUserId();
    if (!userId) {
      emitLifecycle('failed', 'signed-in-user-id-unavailable');
      return undefined;
    }

    const matchingEntries = (payload?.entries ?? []).filter(
      (entry) => entry?.userId === userId || entry?.game?.player?.id === userId,
    );

    if (matchingEntries.length !== 1) {
      emitLifecycle('skipped', 'signed-in-player-entry-not-unique');
      return undefined;
    }

    const game = matchingEntries[0].game;
    const rounds = game?.rounds;
    const guesses = game?.player?.guesses;

    if (!game?.token || !Array.isArray(rounds) || !Array.isArray(guesses) || rounds.length === 0) {
      emitLifecycle('failed', 'required-game-fields-unavailable');
      return undefined;
    }

    if (rounds.length !== guesses.length) {
      emitLifecycle('failed', 'round-and-guess-arrays-unaligned');
      return undefined;
    }

    if (emittedGameTokens.has(game.token)) {
      emitLifecycle('duplicate', 'game-already-emitted');
      return undefined;
    }

    const capturedAt = new Date().toISOString();
    const envelope = {
      capturedAt,
      contractVersion: 1,
      evidence: {
        responseObservedAt: capturedAt,
        resultViewVisibleAt: capturedAt,
      },
      game: {
        guesses: guesses.map((guess) => ({
          distanceInMeters: guess.distanceInMeters,
          lat: guess.lat,
          lng: guess.lng,
          roundScoreInPoints: guess.roundScoreInPoints,
          skippedRound: Boolean(guess.skippedRound),
          time: guess.time,
          timedOut: Boolean(guess.timedOut),
          timedOutWithGuess: Boolean(guess.timedOutWithGuess),
        })),
        mapId: game.map?.slug ?? game.map?.id,
        mapName: game.mapName,
        mode: game.mode,
        rounds: rounds.map((round) => ({
          lat: round.lat,
          lng: round.lng,
          startTime: round.startTime,
        })),
        token: game.token,
        totalDistanceInMeters: game.player?.totalDistanceInMeters,
        totalScore: game.player?.totalScore,
        totalTime: game.player?.totalTime,
      },
      mode: 'daily-challenge-free',
      source: SOURCE,
    };

    emittedGameTokens.add(game.token);
    return envelope;
  };

  const handlePayload = (payload) => {
    const envelope = createEnvelope(payload);
    if (!envelope) {
      return;
    }

    emit({
      envelope,
      type: 'geoguessr-coach:raw-capture',
    });
    emitLifecycle('completed', 'raw-capture-emitted');
  };

  const observeResponse = (url, response) => {
    if (!isCandidateResponse(url) || !response?.ok) {
      return;
    }

    response
      .clone()
      .json()
      .then(handlePayload)
      .catch(() => emitLifecycle('failed', 'candidate-response-not-json'));
  };

  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const request = args[0];
    const url = typeof request === 'string' ? request : request?.url;

    observeResponse(url, response);
    return response;
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function open(method, url, ...rest) {
    this.__geoguessrCoachUrl = typeof url === 'string' ? url : url?.toString();
    return originalOpen.call(this, method, url, ...rest);
  };

  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function send(...args) {
    this.addEventListener(
      'loadend',
      () => {
        if (
          !isCandidateResponse(this.__geoguessrCoachUrl) ||
          this.status < 200 ||
          this.status >= 300
        ) {
          return;
        }

        try {
          handlePayload(JSON.parse(this.responseText));
        } catch {
          emitLifecycle('failed', 'candidate-response-not-json');
        }
      },
      { once: true },
    );

    return originalSend.apply(this, args);
  };
})();
