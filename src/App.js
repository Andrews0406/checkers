import React, {useEffect, useState} from 'react';
import {
  Dimensions,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
//Config
import {config, winTypes} from './config';
import {media} from './assets/media';

const {width} = Dimensions.get('screen');

const App = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const [modalVisible, setModalVisible] = useState(false);

  const [mode, setMode] = useState('');

  const [player_data, setPlayer_data] = useState({});
  const [player_cdata, setPlayer_cdata] = useState({});
  const [board, setBoard] = useState(createBoard());
  const [currentPlayer, setCurrentPlayer] = useState(config.colors.p1);
  const [dropping, setDropping] = useState(false);
  const [win, setWin] = useState(null);
  const [flashTimer, setFlashTimer] = useState(null);

  const clickFn = select_mode => {
    setBoard(createBoard());
    setCurrentPlayer(config.colors.p1);
    setWin(null);
    setModalVisible(false);
    setMode(select_mode);
  };

  const getData = async () => {
    try {
      const value = await AsyncStorage.getItem('player_data');
      if (value !== null) {
        console.log(JSON.parse(value));
        setPlayer_data(JSON.parse(value));
      } else {
        setPlayer_data({Player_1: 0, Player_2: 0});
      }
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  useEffect(() => {
    if (currentPlayer === config.colors.p2 && mode == 'computer') {
      var randColumn = Math.floor(Math.random() * config.columns);
      handleDrop(randColumn);
    }
  }, [currentPlayer]);

  const storeData = async player_data => {
    try {
      const jsonValue = JSON.stringify(player_data);
      await AsyncStorage.setItem('player_data', jsonValue);
    } catch (e) {
      console.log(e);
    }
  };

  function getIndex(row, column) {
    const index = row * config.columns + column;
    if (index > config.rows * config.columns) return null;
    return index;
  }

  function getRowAndColumn(index) {
    if (index > config.rows * config.columns) return null;
    const row = Math.floor(index / config.columns);
    const column = Math.floor(index % config.columns);
    return {
      row,
      column,
    };
  }

  function createBoard() {
    return new Array(config.rows * config.columns).fill(config.colors.empty);
  }

  function restartGame() {
    setBoard(createBoard());
    setCurrentPlayer(config.colors.p1);
    setWin(null);
    setModalVisible(false);
  }

  function findFirstEmptyRow(column) {
    let {empty} = config.colors;
    let {rows} = config;
    for (let i = 0; i < rows; i++) {
      if (board[getIndex(i, column)] !== empty) {
        return i - 1;
      }
    }
    return rows - 1;
  }

  async function handleDrop(column) {
    if (dropping || win) return;
    const row = findFirstEmptyRow(column);
    if (row < 0) return;
    setDropping(true);
    await animateDrop(row, column, currentPlayer);
    setDropping(false);
    const newBoard = board.slice();
    newBoard[getIndex(row, column)] = currentPlayer;
    setBoard(newBoard);

    setCurrentPlayer(
      currentPlayer === config.colors.p1 ? config.colors.p2 : config.colors.p1,
    );
  }

  async function animateDrop(row, column, color, currentRow) {
    if (currentRow === undefined) {
      currentRow = 0;
    }
    return new Promise(resolve => {
      if (currentRow > row) {
        return resolve();
      }
      if (currentRow > 0) {
        const newBoard = board.slice();
        newBoard[getIndex(currentRow, column)] = currentPlayer;
        setBoard(newBoard);
      }
      setTimeout(
        () => resolve(animateDrop(row, column, color, ++currentRow)),
        config.dropAnimationRate,
      );
    });
  }

  const SingleCell = ({data}) => {
    var {i, color} = data;
    if (i < 6) {
      return (
        <TouchableOpacity
          style={{
            height: width / config.columns,
            width: width / config.columns,
          }}
          onPress={() => handleDrop(i)}>
          <View
            style={{
              height: width / config.columns,
              width: width / config.columns,
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              backgroundColor: '#AAAAAA',
            }}>
            <View
              style={{
                height: 40,
                width: 40,
                backgroundColor: color,
                borderRadius: width / config.columns,
              }}
            />
          </View>
        </TouchableOpacity>
      );
    } else {
      return (
        <View
          style={{
            height: width / config.columns,
            width: width / config.columns,
          }}>
          <View
            style={{
              height: width / config.columns,
              width: width / config.columns,
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              backgroundColor: '#AAAAAA',
            }}>
            <View
              style={{
                height: 40,
                width: 40,
                backgroundColor: color,
                borderRadius: width / config.columns,
              }}
            />
          </View>
        </View>
      );
    }
  };

  useEffect(() => {
    if (!win) {
      return;
    }

    var win_player = win.winner === config.colors.p1 ? 'Player_1' : 'Player_2';
    if (currentPlayer === config.colors.p2 && mode == 'computer') {
      var data = player_cdata;
      var cnt = data[win_player];
      if (cnt) {
        data[win_player] = cnt + 1;
      } else {
        data[win_player] = 1;
      }
      storeData({player_data, player_cdata: data});
    } else {
      var data = player_data;
      var cnt = data[win_player];
      if (cnt) {
        data[win_player] = cnt + 1;
      } else {
        data[win_player] = 1;
      }
      storeData({player_data: data, player_cdata});
    }
    setModalVisible(true);

    function flashWinningCells(on) {
      const {empty} = config.colors;
      const {winner} = win;
      const newBoard = board.slice();
      for (let o of win.winningCells) {
        newBoard[getIndex(o.row, o.column)] = on ? winner : empty;
      }
      setBoard(newBoard);
      setFlashTimer(
        setTimeout(() => flashWinningCells(!on), config.flashAnimationRate),
      );
    }

    flashWinningCells(false);
  }, [win, setFlashTimer]);

  useEffect(() => {
    if (!win) {
      if (flashTimer) clearTimeout(flashTimer);
    } else {
    }
  }, [win, flashTimer]);

  useEffect(() => {
    if (dropping || win) return;

    function isWin() {
      return (
        isForwardsDiagonalWin() ||
        isBackwardsDiagonalWin() ||
        isHorizontalWin() ||
        isVerticalWin() ||
        null
      );
    }

    function createWinState(start, winType) {
      const win = {
        winner: board[start],
        winningCells: [],
      };

      let pos = getRowAndColumn(start);

      while (true) {
        let current = board[getIndex(pos.row, pos.column)];
        if (current === win.winner) {
          win.winningCells.push({...pos});
          if (winType === winTypes.horizontal) {
            pos.column++;
          } else if (winType === winTypes.vertical) {
            pos.row++;
          } else if (winType === winTypes.backwardsDiagonal) {
            pos.row++;
            pos.column++;
          } else if (winType === winTypes.forwardsDiagonal) {
            pos.row++;
            pos.column--;
          }
        } else {
          return win;
        }
      }
    }

    function isHorizontalWin() {
      const {rows} = config;
      const {columns} = config;
      const {empty} = config.colors;
      for (let row = 0; row < rows; row++) {
        for (let column = 0; column <= columns - 3; column++) {
          let start = getIndex(row, column);
          if (board[start] === empty) continue;
          let counter = 1;
          for (let k = column + 1; k < column + 3; k++) {
            if (board[getIndex(row, k)] === board[start]) {
              counter++;
              if (counter === 3)
                return createWinState(start, winTypes.horizontal);
            }
          }
        }
      }
    }
    function isVerticalWin() {
      const {rows} = config;
      const {columns} = config;
      const {empty} = config.colors;
      for (let column = 0; column < columns; column++) {
        for (let row = 0; row <= rows - 3; row++) {
          let start = getIndex(row, column);
          if (board[start] === empty) continue;
          let counter = 1;
          for (let k = row + 1; k < row + 3; k++) {
            if (board[getIndex(k, column)] === board[start]) {
              counter++;
              if (counter === 3)
                return createWinState(start, winTypes.vertical);
            }
          }
        }
      }
    }
    function isBackwardsDiagonalWin() {
      const {rows} = config;
      const {columns} = config;
      const {empty} = config.colors;
      for (let row = 0; row <= rows - 3; row++) {
        for (let column = 0; column <= columns - 3; column++) {
          let start = getIndex(row, column);
          if (board[start] === empty) continue;
          let counter = 1;
          for (let i = 1; i < 3; i++) {
            if (board[getIndex(row + i, column + i)] === board[start]) {
              counter++;
              if (counter === 3)
                return createWinState(start, winTypes.backwardsDiagonal);
            }
          }
        }
      }
    }
    function isForwardsDiagonalWin() {
      const {rows} = config;
      const {columns} = config;
      const {empty} = config.colors;
      for (let row = 0; row <= rows - 3; row++) {
        for (let column = 3; column <= columns; column++) {
          let start = getIndex(row, column);
          if (board[start] === empty) continue;
          let counter = 1;
          for (let i = 1; i < 3; i++) {
            if (board[getIndex(row + i, column - i)] === board[start]) {
              counter++;
              if (counter === 3)
                return createWinState(start, winTypes.forwardsDiagonal);
            }
          }
        }
      }
    }
    setWin(isWin());
  }, [board, dropping, win]);

  return (
    <View
      style={{
        ...styles.container,
        backgroundColor: isDarkMode ? 'black' : 'white',
      }}>
      <View
        style={{
          marginTop: 30,
        }}>
        <Text style={{...styles.title, color: isDarkMode ? 'white' : 'black'}}>
          Connect 3
        </Text>
      </View>
      {mode ? (
        <View style={styles.buttonContainer}>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              width,
              height: width,
            }}>
            {board.map((color, i) => (
              <SingleCell key={i} data={{color, i}} />
            ))}
          </View>
          {!win && (
            <Text style={{color: currentPlayer, marginVertical: 20}}>
              {currentPlayer === config.colors.p1
                ? 'Player 1'
                : mode === 'player'
                ? 'Player 2'
                : 'Computer'}
            </Text>
          )}
          <TouchableOpacity
            onPress={() => clickFn('')}
            style={{
              ...styles.button,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-evenly',
            }}>
            <Image source={media.home_white} style={{width: 15, height: 15}} />
            <Text style={styles.button_text}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => clickFn('player')}>
            <Text style={styles.button_text}>Play 2 vs 2</Text>
          </TouchableOpacity>
          <Text style={styles.or_text}>or</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => clickFn('computer')}>
            <Text style={styles.button_text}>Play vs Computer</Text>
          </TouchableOpacity>
        </View>
      )}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(!modalVisible);
        }}>
        <View
          style={{
            flex: 1,
            padding: 50,
            backgroundColor: '#00000090',
            justifyContent: 'center',
          }}>
          <View
            style={{
              backgroundColor: 'white',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 5,
              padding: 20,
            }}>
            {win && (
              <Text style={{color: win.winner, marginVertical: 20}}>
                {win.winner === config.colors.p1
                  ? 'Player 1 '
                  : mode == 'player'
                  ? 'Player 2 '
                  : 'Computer'}
                WON!
              </Text>
            )}
            <View
              style={{
                flexDirection: 'row',
                marginBottom: 30,
                flexWrap: 'wrap',
              }}>
              <View
                style={{
                  width: '50%',
                  borderWidth: 1,
                  padding: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Text>Player 1</Text>
              </View>
              <View
                style={{
                  width: '50%',
                  borderWidth: 1,
                  padding: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Text>{mode === 'player' ? 'Player 2' : 'Computer'}</Text>
              </View>
              <View
                style={{
                  width: '50%',
                  borderWidth: 1,
                  padding: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Text>
                  {mode === 'player'
                    ? player_data.Player_1 ?? 0
                    : player_cdata.Player_1 ?? 0}
                </Text>
              </View>
              <View
                style={{
                  width: '50%',
                  borderWidth: 1,
                  padding: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Text>
                  {mode === 'player'
                    ? player_data.Player_2 ?? 0
                    : player_cdata.Player_2 ?? 0}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.button}
              onPress={() => restartGame()}>
              <Text style={styles.button_text}>Play Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  buttonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
  },
  button: {
    width: 150,
    backgroundColor: '#58a6ff',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  button_text: {
    fontWeight: '600',
    color: 'white',
  },
  or_text: {
    marginVertical: 15,
    fontWeight: '600',
    fontSize: 18,
  },
});

export default App;
