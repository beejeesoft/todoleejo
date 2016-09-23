var STATE = {
  open : {name:'open', left:'deleted', right:'inProgress'}, 
  inProgress: {name:'inProgress', left:'open', right:'done'}, 
  done : {name:'done', left:'inProgress', right:'done'},
  deleted: {name:'deleted', left:'open', right:'deleted'}
};

exports.STATE = STATE;