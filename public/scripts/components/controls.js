define([
    'lib/react',
    'game-logic/engine',
    'lib/keymaster', //TODO: This is window
    'lib/clib',
    'stores/game-settings'
    //'jquery-text-width'
], function(
    React,
    Engine,
    KeyMaster,
    Clib,
    GameSettings
    //jQuery,
){
    /* Constants */
    //var _widthTrigger = 992;

    var D = React.DOM;
    var cx = React.addons.classSet;

    function getBetMultiplier() {
        if(GameSettings.useCustomBetMultiplier) {
            return GameSettings.customBetMultiplier;
        } else {
            //Chase mode
            var payout = (98/Engine.winProb);
            return (payout/(payout-1));
        }
    }

    function getState() {
        var state = {};
        state.engine = Engine; //Just a reference no real reason to do this but to remember than this reflects a change of the state

        //Calculate control states that are based on engine states
        //state.canDivideBet = (Engine.wager >= 200);
        //state.canDoubleBet = ( Engine.wager*2 <= Engine.balance && Engine.wager*2 <= Engine.maxBet  );
        state.notEnoughBalance = Engine.isBetValid();
        state.betTooHigh = Engine.isBetTooHigh();
        return state;
    }

    function jackPotProbText() {

        var ratio = Clib.jackWinProbSatoshisRatio(Engine.wager, Engine.jackpot);

        if(ratio <= 1) {
          var multi = '';
          var inHowMany = 1/ratio;

          if (inHowMany > 1e9) {
            inHowMany = inHowMany/1e9;
            multi = 'B';
          } else if (inHowMany > 1e6) {
            inHowMany = inHowMany/1e6;
            multi = 'M';
          } else if (inHowMany > 1e3) {
            inHowMany = inHowMany/1e3;
            multi = 'K';
          }
          return '1 in ' + Math.round(inHowMany) + multi;
        } else {
            return '1 in 1';
        }
    }

    return React.createClass({
        displayName: 'ControlsContainer',

        propTypes: {
            _toggleSettings: React.PropTypes.func.isRequired,
            disableControls: React.PropTypes.string.isRequired,
            _toggleDepositAddress: React.PropTypes.func.isRequired
        },

        getInitialState: function() {
            return getState();
        },

        componentDidMount: function() {
            Engine.on('all', this._onChange);
            GameSettings.on('all', this._onChange);
            KeyMaster.key('c', this._clearHistory);
            KeyMaster.key('q', this._decreaseWinProb);
            KeyMaster.key('r', this._increaseWinProb);
            KeyMaster.key('up', this._chaseBet);
            KeyMaster.key('down', this._divideBet);
            KeyMaster.key('right', this._betHi);
            KeyMaster.key('left', this._betLo);
        },

        componentWillUnmount: function() {
            Engine.off('all', this._onChange);
            GameSettings.off('all', this._onChange);
            KeyMaster.key.unbind('c', this._clearHistory);
            KeyMaster.key.unbind('q', this._decreaseWinProb);
            KeyMaster.key.unbind('r', this._increaseWinProb);
            KeyMaster.key.unbind('up', this._chaseBet);
            KeyMaster.key.unbind('down', this._divideBet);
            KeyMaster.key.unbind('right', this._betHi);
            KeyMaster.key.unbind('left', this._betLo);
        },

        _onChange: function() {
            if(this.isMounted())
                this.setState(getState());
        },

        _clearHistory: function() {
            if(!this.props.disableControls)
                Engine.clearHistory();
        },

        _increaseWinProb: function() {
            if(!this.props.disableControls)
                Engine.increaseWinProb();
        },

        _decreaseWinProb: function() {
            if(!this.props.disableControls)
                Engine.decreaseWinProb();
        },

        _betHi: function() {
            if(Engine.gameState != 'BETTING' && !this.state.notEnoughBalance && !this.state.betTooHigh && !this.props.disableControls)
                Engine.bet(true);
        },

        _betLo: function() {
            if(Engine.gameState != 'BETTING' && !this.state.notEnoughBalance && !this.state.betTooHigh && !this.props.disableControls)
                Engine.bet(false)
        },

        _chaseBet: function() {
            if(!this.props.disableControls)
                Engine.setWager(Engine.wager * getBetMultiplier());
        },

        _divideBet: function() {
            if(!this.props.disableControls) {
                var newWager = Engine.wager/getBetMultiplier();
                if(newWager < 100)
                    newWager = 100;

                Engine.setWager(newWager);
            }
        },

        render: function() {

            var isBetting = Engine.gameState === 'BETTING';

            var betHiBtn, betLoBtn, chaseBetBtn, divideBetBtn;

            if(GameSettings.showButtons || this.state.notEnoughBalance || this.state.betTooHigh) {

                var betHiBtnClasses = cx({
                    'btn': true,
                    'btn-default': true,
                    'ctl-button': true,
                    'cant-bet': (this.state.notEnoughBalance || this.state.betTooHigh),
                    'betting': (isBetting && Engine.currentBet.hiLo === true)
                });
                betHiBtn = D.button(
                    {
                        id: 'bet-hi-button',
                        className: betHiBtnClasses,
                        onClick: this.state.betTooHigh? this.props._toggleSettings : this.state.notEnoughBalance? this.props._toggleDepositAddress : this._betHi,
                        disabled: isBetting
                    },
                    this.state.betTooHigh?
                        'Supported':
                    this.state.notEnoughBalance?
                        'Deposit in Vault' :
                        D.div(null, D.span(null, (101-Engine.winProb) + ' to 100 '), D.i({ className: 'fa fa-caret-square-o-right' }))
                );

                var betLoBtnClasses = cx({
                    'btn': true,
                    'btn-default': true,
                    'ctl-button': true,
                    'cant-bet': (this.state.notEnoughBalance || this.state.betTooHigh),
                    'betting': (isBetting && Engine.currentBet.hiLo === false)
                });
                betLoBtn = D.button(
                    {
                        id: 'bet-lo-button',
                        className: betLoBtnClasses,
                        onClick: this.state.betTooHigh? this.props._toggleSettings : this.state.notEnoughBalance? this.props._toggleDepositAddress : this._betLo,
                        disabled: isBetting
                    },
                    this.state.betTooHigh?
                        'Bet not':
                    this.state.notEnoughBalance?
                        'Not enough bits' :
                        D.div(null, D.i({ className: 'fa fa-caret-square-o-left' }), D.span(null, ('1 to ' + Engine.winProb)))
                );

                if(GameSettings.showButtons) {
                    chaseBetBtn = D.button({ id: 'bet-chase-bet-button', className: 'btn btn-default ctl-button', onClick: this._chaseBet },
                        D.span(null, 'x' + getBetMultiplier().toFixed(2)),
                        D.i({ className: 'fa fa-caret-square-o-up' })
                    );

                    divideBetBtn = D.button({ id: 'bet-divide-bet-button', className: 'btn btn-default ctl-button', onClick: this._divideBet },
                        D.i({ className: 'fa fa-caret-square-o-down' }),
                        D.span(null, '/' + getBetMultiplier().toFixed(2))
                    );
                } else {
                    chaseBetBtn = divideBetBtn = null;
                }


            } else {
                betHiBtn = betLoBtn = chaseBetBtn = divideBetBtn = null;
            }

            return D.div({ id: 'controls-container-box' },

                //Game Buttons
                betHiBtn,
                betLoBtn,
                chaseBetBtn,
                divideBetBtn,

                D.div({ id: 'ctl-bet-box', onClick: this.props._toggleSettings },
                    D.div({ className: 'ctl-state-name' },
                        D.span(null, 'BET')
                    ),
                    D.div({ className: 'crl-in-bottom' },
                        D.div({ className: 'ctl-state-amount' },
                            D.span(null, Clib.formatSatoshis(Engine.wager, 0))
                        ),
                        D.span({ className: 'ctrl-state-lbl' },
                            '\u00a0', Clib.bitsTextTerm(Clib.satToBitRounded(Engine.wager))
                        )
                    )
                ),

                D.div({ id: 'ctl-payout-box', onClick: this.props._toggleSettings },
                    D.div({ className: 'ctl-state-name' },
                        D.span(null, 'PAYOUT')
                    ),
                    D.div({ className: 'crl-in-bottom' },
                        D.div({ className: 'ctl-state-amount' },
                            D.span(null, (98/Engine.winProb).toFixed(2))
                        ),
                        D.span({ className: 'ctrl-state-lbl' },
                            D.i({ className: 'fa fa-times' })
                        )
                    )
                ),

                D.div({ id: 'ctl-win-prob-box', onClick: this.props._toggleSettings },
                    D.div({ className: 'ctl-state-name' },
                        D.span(null, 'WIN PROB')
                    ),
                    D.div({ className: 'crl-in-bottom' },
                        D.div({ className: 'ctl-state-amount' },
                            D.span(null, Engine.winProb)
                        ),
                        D.span({ className: 'ctrl-state-lbl' },
                            D.i({ className: 'icon-percent'})
                        )
                    )
                ),

                D.div({ id: 'ctl-jackpot-box', onClick: this.props._toggleSettings },
                    D.div({ className: 'ctl-state-name' },
                        D.span(null, 'JACKPOT PROB')
                    ),
                    D.div({ className: 'ctl-state-amount' },
                        D.span(null, jackPotProbText())
                    )
                )

            );

        }
    });
});