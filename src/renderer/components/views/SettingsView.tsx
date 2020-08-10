import './SettingsView.scss'

import * as React from 'react'
import { connect, Dispatch } from 'react-redux'
import { SortableContainer, SortableHandle, SortableElement } from 'react-sortable-hoc'

import { connector, gamepadManager } from '../..'
import { SMMButton } from '../buttons/SMMButton'
import { HotkeyButton } from '../buttons/HotkeyButton'
import { ToggleButton } from '../buttons/ToggleButton'
import { WarningPanel } from '../panels/WarningPanel'
import {
  setUsername,
  setCharacter,
  setEmuChat,
  setGlobalHotkeysEnabled,
  setHotkeyBindings,
  setCharacterCyclingOrder,
  setGamepadId
} from '../../actions/save'
import { State, ElectronSaveData } from '../../../models/State.model'
import { showSnackbar } from '../../actions/snackbar'
import { HotkeyShortcut } from '../../../main/HotkeyManager'

interface SettingsViewProps {
  dispatch: Dispatch<State>
  saveData: ElectronSaveData
  connectionError: string
}

interface SettingsViewState {
  username: string
  characterId: number
  emuChat: boolean
  globalHotkeysEnabled: boolean
  hotkeyBindings: { [shortcut in HotkeyShortcut]: string[] }
  characterCyclingOrder: Array<{characterId: number, on: boolean}>
  gamepadId: string | undefined
  warning: string
}

export const MIN_LENGTH_USERNAME = 3
export const MAX_LENGTH_USERNAME = 24

const CHARACTER_ICONS: { [characterId: number]: string } = {
  0: 'img/mario.png',
  1: 'img/luigi.png',
  2: 'img/yoshi.png',
  3: 'img/wario.png',
  4: 'img/peach.png',
  5: 'img/toad.png',
  6: 'img/waluigi.png',
  7: 'img/rosalina.png',
  8: 'img/sonic.png',
  9: 'img/knuckles.png',
  10: 'img/goomba.png',
  11: 'img/kirby.png'
}

class View extends React.PureComponent<SettingsViewProps, SettingsViewState> {
  constructor (public props: SettingsViewProps) {
    super(props)
    this.state = {
      username: props.saveData.username,
      characterId: props.saveData.character,
      emuChat: props.saveData.emuChat,
      globalHotkeysEnabled: props.saveData.globalHotkeysEnabled,
      hotkeyBindings: props.saveData.hotkeyBindings,
      characterCyclingOrder: props.saveData.characterCylingOrder,
      gamepadId: props.saveData.gamepadId,
      warning: props.saveData.username ? '' : 'You must set a username'
    }
    this.onGamepadsChanged = this.onGamepadsChanged.bind(this)
    this.onUsernameChange = this.onUsernameChange.bind(this)
    this.onCharacterChange = this.onCharacterChange.bind(this)
    this.onEmuChatChange = this.onEmuChatChange.bind(this)
    this.onGlobalHotkeysChange = this.onGlobalHotkeysChange.bind(this)
    this.onHotkeyBindingChange = this.onHotkeyBindingChange.bind(this)
    this.onCharacterCyclingToggled = this.onCharacterCyclingToggled.bind(this)
    this.onCharacterCyclingOrderChange = this.onCharacterCyclingOrderChange.bind(this)
    this.onSave = this.onSave.bind(this)
  }

  componentDidMount () {
    // Attach gamepad connection/disconnection listeners
    window.addEventListener('gamepadconnected', this.onGamepadsChanged)
    window.addEventListener('gamepaddisconnected', this.onGamepadsChanged)
  }

  componentWillUnmount () {
    // Detach gamepad connection/disconnection listeners
    window.removeEventListener('gamepadconnected', this.onGamepadsChanged)
    window.removeEventListener('gamepaddisconnected', this.onGamepadsChanged)
  }

  onGamepadsChanged () {
    this.forceUpdate()
  }

  componentDidUpdate (prevProps: SettingsViewProps) {
    const character = this.props.saveData.character
    if (prevProps.saveData.character !== character) { // Update dropdown option menu
      this.setState({ characterId: character })
    }
  }

  onUsernameChange (e: React.ChangeEvent<{ value: string }>) {
    let value = e.target.value.replace(/\W/g, '')
    if (value.length > MAX_LENGTH_USERNAME) {
      value = value.substr(0, MAX_LENGTH_USERNAME)
    }
    this.setState({
      username: value
    })
  }

  onCharacterChange (e: React.ChangeEvent<{ value: string }>) {
    const characterId = parseInt(e.target.value, 10)
    this.setState({
      characterId
    })
  }

  onEmuChatChange (e: React.ChangeEvent<{ checked: boolean }>) {
    const emuChat = e.target.checked
    this.setState({
      emuChat
    })
  }

  onGlobalHotkeysChange (e: React.ChangeEvent<{ checked: boolean }>) {
    const globalHotkeysEnabled = e.target.checked
    this.setState({
      globalHotkeysEnabled
    })
  }

  onHotkeyBindingChange (shortcut: HotkeyShortcut, hotkey?: string) {
    const { hotkeyBindings } = this.state
    hotkeyBindings[shortcut] = hotkey ? [hotkey] : []
    this.setState({ hotkeyBindings })
  }

  onCharacterCyclingToggled ({ cycleIndex, toggled }: {cycleIndex: number, toggled: boolean}) {
    const { characterCyclingOrder } = this.state
    characterCyclingOrder[cycleIndex].on = toggled
    this.setState({ characterCyclingOrder })
  }

  onCharacterCyclingOrderChange ({ newIndex, oldIndex }: {newIndex: number, oldIndex: number}) {
    const { characterCyclingOrder } = this.state
    const oldItem = characterCyclingOrder.splice(oldIndex, 1)[0] // remove item from old index
    characterCyclingOrder.splice(newIndex, 0, oldItem) // reinsert item at new index
    this.setState({ characterCyclingOrder: characterCyclingOrder.slice() })
  }

  onSave () {
    const username = this.state.username.replace(/\W/g, '')
    const { characterCyclingOrder, hotkeyBindings, globalHotkeysEnabled, gamepadId } = this.state
    if (username.length < MIN_LENGTH_USERNAME) {
      this.setState({
        warning: 'Your username is too short'
      })
    } else {
      const { dispatch } = this.props
      connector.playerUpdate({ username, characterId: this.state.characterId })
      connector.changeEmuChat(this.state.emuChat)
      connector.changeHotkeyBindings({ hotkeyBindings, globalHotkeysEnabled })
      connector.changeCharacterCyclingOrder({ characterCyclingOrder })
      dispatch(setUsername(username))
      dispatch(setCharacter(this.state.characterId))
      dispatch(setEmuChat(this.state.emuChat))
      dispatch(setGlobalHotkeysEnabled(globalHotkeysEnabled))
      dispatch(setHotkeyBindings(hotkeyBindings))
      dispatch(setCharacterCyclingOrder(characterCyclingOrder))
      dispatch(setGamepadId(gamepadId))
      dispatch(showSnackbar('Saved'))
    }
  }

  renderCharacterHotkeyButtons () {
    const buttons = []
    for (let i = 0; i < 12; i++) {
      buttons.push(<HotkeyButton
        key={i}
        shortcut={`${i}` as HotkeyShortcut}
        iconSrc={CHARACTER_ICONS[i]}
        hotkey={this.state.hotkeyBindings[`${i}` as HotkeyShortcut]?.[0]}
        onClick={this.onHotkeyBindingChange}
        onRightClick={this.onHotkeyBindingChange}
      />)
    }
    return buttons
  }

  render () {
    const { gamepadId, warning } = this.state
    const connectionError = this.props.connectionError
    const gamepads = gamepadManager.getConnectedGamepads()
    const styles: Record<string, React.CSSProperties> = {
      flexCenter: {
        alignItems: 'center',
        justifyContent: 'center'
      },
      label: {
        width: '30%'
      },
      input: {
        flex: '1 0 auto',
        fontSize: '16px',
        width: '0'
      },
      checkBox: {
        alignSelf: 'center',
        margin: '0 auto',
        width: '20px',
        height: '20px'
      }
    }
    return (
      <div className='settings-view'>
        <div className='settings-view-content'>
          {
            warning &&
          <WarningPanel warning={warning} />
          }
          {
            connectionError &&
          <WarningPanel warning={connectionError} />
          }

          <div className='settings-view-setting'>
            <div style={styles.label}>Username:</div>
            <input style={styles.input} value={this.state.username} onChange={this.onUsernameChange} />
          </div>

          <div className='settings-view-setting'>
            <div style={styles.label}>Character:</div>
            <select style={styles.input} value={this.state.characterId} onChange={this.onCharacterChange}>
              <option value='0'>Mario</option>
              <option value='1'>Luigi</option>
              <option value='2'>Yoshi</option>
              <option value='3'>Wario</option>
              <option value='4'>Peach</option>
              <option value='5'>Toad</option>
              <option value='6'>Waluigi</option>
              <option value='7'>Rosalina</option>
              <option value='8'>Sonic</option>
              <option value='9'>Knuckles</option>
              <option value='10'>Goomba</option>
              <option value='11'>Kirby</option>
            </select>
          </div>

          <div className='settings-view-setting'>
            <div style={styles.label}>Gamepad:</div>
            <select style={styles.input} value={gamepadId ?? undefined} onChange={(e) => {
              gamepadManager.selectedGamepad = gamepadManager.getConnectedGamepads().find((gamepad) =>
                (gamepad ? gamepad.id : undefined) === e.target.value
              ) ?? undefined
              this.setState({ gamepadId: e.target.value })
            }}>
              {
                gamepads && [
                  <option key={-1} value={undefined}>None</option>
                ].concat(gamepads.filter(function nonNull<Gamepad> (gamepad: Gamepad | null): gamepad is Gamepad {
                  return !!gamepad
                }).map((gamepad, index) => (
                  <option key={index} value={gamepad.id}>{gamepad.id}</option>
                )))
              }
            </select>
          </div>

          <div className='settings-view-setting'>
            <div style={styles.label}>In-Game Chat View:</div>
            <input
              style={styles.checkBox}
              type='checkbox'
              checked={this.state.emuChat}
              onChange={this.onEmuChatChange}
            />
          </div>

          <div className='settings-view-setting'>
            <div style={styles.label}>Enable global character keyboard shortcuts:</div>
            <input
              style={styles.checkBox}
              type='checkbox'
              checked={this.state.globalHotkeysEnabled}
              onChange={this.onGlobalHotkeysChange}
            />
          </div>

          <div>Character Hotkeys (right click to unassign):</div>

          <div className='settings-view-hotkeys'>
            {this.renderCharacterHotkeyButtons()}
          </div>

          <div style={Object.assign({}, styles.setting, styles.flexCenter)}>
            <div style={Object.assign({}, styles.setting, styles.flexCenter, { flexDirection: 'column' })}>
              <div>Previous Character</div>
              <HotkeyButton
                shortcut={HotkeyShortcut.PREVIOUS_CHARACTER}
                hotkey={this.state.hotkeyBindings.previousCharacter?.[0]}
                onClick={this.onHotkeyBindingChange}
                onRightClick={this.onHotkeyBindingChange}
              />
            </div>
            <div style={Object.assign({}, styles.setting, styles.flexCenter, { flexDirection: 'column' })}>
              <div>Next Character</div>
              <HotkeyButton
                shortcut={HotkeyShortcut.NEXT_CHARACTER}
                hotkey={this.state.hotkeyBindings.nextCharacter?.[0]}
                onClick={this.onHotkeyBindingChange}
                onRightClick={this.onHotkeyBindingChange}
              />
            </div>
          </div>

          <div>Character Cycling Order (click to toggle, drag to reorder)</div>

          <this.SortableList
            useDragHandle
            characterCyclingOrder={this.state.characterCyclingOrder}
            onSortEnd={this.onCharacterCyclingOrderChange}
          />

          <SMMButton
            text='Unbind all'
            onClick={() => {
              this.setState({
                hotkeyBindings: {
                  [HotkeyShortcut.MARIO]: [],
                  [HotkeyShortcut.LUIGI]: [],
                  [HotkeyShortcut.YOSHI]: [],
                  [HotkeyShortcut.WARIO]: [],
                  [HotkeyShortcut.PEACH]: [],
                  [HotkeyShortcut.TOAD]: [],
                  [HotkeyShortcut.WALUIGI]: [],
                  [HotkeyShortcut.ROSALINA]: [],
                  [HotkeyShortcut.SONIC]: [],
                  [HotkeyShortcut.KNUCKLES]: [],
                  [HotkeyShortcut.GOOMBA]: [],
                  [HotkeyShortcut.KIRBY]: [],
                  [HotkeyShortcut.NEXT_CHARACTER]: [],
                  [HotkeyShortcut.PREVIOUS_CHARACTER]: []
                }
              })
            }}
            styles={{
              subButton: {
                text: {
                  textAlign: 'center',
                  width: '100%'
                }
              }
            }}
          />
          <SMMButton
            text='Enable all'
            onClick={() => {
              const { characterCyclingOrder } = this.state
              characterCyclingOrder.forEach((_, index) => { characterCyclingOrder[index].on = true })
              this.setState({ characterCyclingOrder: characterCyclingOrder.slice() })
            }}
            styles={{
              subButton: {
                text: {
                  textAlign: 'center',
                  width: '100%'
                }
              }
            }}
          />
          <SMMButton
            text='Disable all'
            onClick={() => {
              const { characterCyclingOrder } = this.state
              characterCyclingOrder.forEach((_, index) => { characterCyclingOrder[index].on = false })
              this.setState({ characterCyclingOrder: characterCyclingOrder.slice() })
            }}
            styles={{
              subButton: {
                text: {
                  textAlign: 'center',
                  width: '100%'
                }
              }
            }}
          />
        </div>

        <div style={{ margin: '10px 0' }}></div>
        <SMMButton
          className='settings-view-save'
          text='Save'
          iconSrc='img/submit.png'
          iconStyle='dark'
          onClick={this.onSave}
          styles={{
            button: {
              margin: '0px',
              alignSelf: 'flex-start',
              justifySelf: 'flex-end'
            },
            icon: {
              padding: '3px'
            }
          }}
        />
      </div>
    )
  }

  private readonly DragHandle = SortableHandle(() => <span>::::::&nbsp;</span>);

  private readonly SortableItem = SortableElement((
    { iconSrc, on, cycleIndex }: {iconSrc: string, on: boolean, cycleIndex: number}
  ) => {
    const styles = {
      icon: {
        padding: '4px',
        width: '40px',
        height: '40px',
        float: 'left',
        borderRadius: '4px'
      }
    } as const
    return (
      <ToggleButton
        on={on}
        onClick={(toggled) => this.onCharacterCyclingToggled({ cycleIndex, toggled })}
      >
        <this.DragHandle />
        <img style={styles.icon} src={iconSrc} />
      </ToggleButton>
    )
  }
  );

  private readonly SortableList = SortableContainer((
    { characterCyclingOrder }: {characterCyclingOrder: Array<{characterId: number, on: boolean}>}
  ) => {
    return (
      <div className='settings-view-sortable-list'>
        {characterCyclingOrder.map(({ characterId, on }, index) => (
          <this.SortableItem
            key={index} index={index}
            cycleIndex={index}
            iconSrc={CHARACTER_ICONS[characterId]}
            on={on}
          />
        ))}
      </div>
    )
  });
}
export const SettingsView = connect((state: State) => ({
  saveData: state.save.appSaveData,
  connectionError: state.connection.error
}))(View)
