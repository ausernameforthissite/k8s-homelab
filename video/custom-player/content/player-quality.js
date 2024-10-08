
function restoreQualityHLS(playerInstance, height) {
  console.log('restoreQualityHLS', height);
  if (height == null) {
    return;
  }
  const list = playerInstance.getQualityLevels();
  const currentQuality = list[playerInstance.getCurrentQuality()];
  // if (currentQuality.height == height) {
  //   return;
  // }
  console.log('restoreQualityHLS: list', list);
  for (const i in list) {
    const item = list[i];
    console.log('restoreQualityHLS: checking item', item.height, height, item);
    if (item.height == height) {
      console.log('restoreQualityHLS: found item', item);
      playerInstance.setCurrentQuality(i);
      return;
    }
  }
  console.log('restoreQualityHLS: no match');
}

function restoreQualityWebRTC(playerInstance, label) {
  // console.log('restoreQualityWebRTC', label);
  if (label == null) {
    return;
  }
  const list = playerInstance.getQualityLevels();
  const currentQuality = list[playerInstance.getCurrentQuality()];
  if (currentQuality.label == label) {
    return;
  }
  // console.log('restoreQualityWebRTC: list', list);
  for (const i in list) {
    const item = list[i];
    // console.log('restoreQualityWebRTC: checking item', item.label, label, item);
    if (item.label == label) {
      console.log('restoreQuality: found item', item);
      playerInstance.setCurrentQuality(i);
      return;
    }
  }
  console.log('restoreQualityWebRTC: no match');
}

export function restoreQuality(playerInstance, qualityLabel, qualityHeight) {
  const currentSourceItem = playerInstance.getSources()[playerInstance.getCurrentSource()];
  if (currentSourceItem == null) {
    return;
  }
  switch (currentSourceItem.type) {
    case 'hls':
    case 'll-hls':
    case 'dash':
      // Ovenplayer can't play HLS when restore is enabled
      // no idea why
      // restoreQualityHLS(playerInstance, qualityHeight);
      break;
    case 'webrtc':
      // restoreQualityWebRTC(playerInstance, qualityLabel);
      break;
  }
}
