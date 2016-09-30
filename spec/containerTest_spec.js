var frisby = require('frisby');
var gc = require('./testConfig');



var TEST_USER = gc.TEST_USER_CONTAINER;
var TEST_USER2 = gc.TEST_USER_CONTAINER2;
var TEST_USER3 = gc.TEST_USER_CONTAINER3;
var TEST_USER4 = gc.TEST_USER_CONTAINER4;
var TEST_PASSW = gc.TEST_PASSW;


var TEST_URL = gc.CONTAINER_URL;
var TODO_URL = gc.TODO_URL;
var REGISTER_URL = gc.REGISTER_URL;
var LOGIN_URL = gc.LOGIN_URL;
var LOGOUT_URL = gc.LOGOUT_URL;


var header1 = {},
  header2 = {},
  header3 = {},
  header4 = {};

var getHeader = function(user) {
  if (TEST_USER === user) return header1;
  if (TEST_USER2 === user) return header2;
  if (TEST_USER3 === user) return header3;
  if (TEST_USER4 === user) return header4;
};
var createManyToDos = function(user, arrayOfSummaries, callback) {
  var result = [];
  var calls = 0;
  var inner = function(res) {
    result.push(res);
    if (++calls == arrayOfSummaries.length) {
      callback(result);
    }
  };
  for (var i = 0; i < arrayOfSummaries.length; i++) {
    createToDo(user, arrayOfSummaries[i], inner);
  }
};


var createToDo = function(user, summary, callback) {
  createToDoWithContainer(user, summary, null, callback);
};

var createToDoWithContainer = function(user, summary, containerId, callback) {

  var query = {
    'summary': summary
  };
  if (containerId !== null) {
    query.containerId = containerId;
  }

  frisby.create('Prepare')
    .addHeaders(getHeader(user))
    .post(TODO_URL, query, {
      json: true
    })
    .expectStatus(200)
    .afterJSON(function(json) {
      callback(json);
    }).toss();
};

var findTodoBySummary = function(summary, array) {
  var inner = function(elem) {
    return elem.summary === summary;
  };

  return array.find(inner);
};


var convertMany = function(user, arrayOfTodos, callback) {
  var result = [];
  var calls = 0;
  var innerCallback = function(res) {
    result.push(res);
    if (++calls === arrayOfTodos.length) {
      callback(result);
    }
  };
  for (var i = 0; i < arrayOfTodos.length; i++) {
    convert(user, arrayOfTodos[i], innerCallback);
  }
};

var convert = function(user, todo, callback) {
  frisby.create('Convert ' + todo.summary)
    .addHeaders(getHeader(user))
    .post(TEST_URL, {
      todoId: todo._id
    }, {
      json: true
    })
    .expectStatus(200)
    .afterJSON(function(json) {
      expect(json.isContainer).toBe(true);
      expect(json.parents.length).toBe(0);
      callback(json);
    }).toss();
};

var callPutToDo = function(user, todo, callback) {
  frisby.create('Put Todo: ')
    .addHeaders(getHeader(user))
    .put(TODO_URL, todo, {
      json: true
    })
    .expectStatus(200)
    .afterJSON(function(json) {
      callback(json);
    }).toss();
};

var callDeleteToDo = function(user, todo, expectStatus, callback) {
  frisby.create('Delete Todo')
    .addHeaders(getHeader(user))
    .delete(TODO_URL + '?todoId=' + todo._id)
    .expectStatus(expectStatus)
    .afterJSON(function(json) {
      callback(json);
    }).toss();
};

var callPutContainer = function(user, container, callback) {
  frisby.create('PUT Container')
    .addHeaders(getHeader(user))
    .put(TEST_URL, container, {
      json: true
    })
    .expectStatus(200)
    .afterJSON(function(json) {
      callback(json);
    }).toss();
};

var addToContainer = function(user, todo, container, callback) {
  todo.parents.push({
    parentId: container._id
  });
  callPutToDo(user, todo, callback);
};

var removeFromContainer = function(user, todo, container, callback) {
  var filter = function(elem, idx, array) {
    return elem.parentId !== container._id;
  };
  var newParents = todo.parents.filter(filter);
  todo.parents = newParents;
  callPutToDo(user, todo, callback);
};

var getUrlParamContainerId = function(param) {
  if (param !== undefined && param !== null && param !== '') {
    return ('?containerId=' + param);
  }
  return '';
};

var checkGetterAndCountTodo = function(user, param, expectedCount, callback) {
  frisby.create('CheckGetter')
    .addHeaders(getHeader(user))
    .get(TODO_URL + getUrlParamContainerId(param))
    .expectStatus(200)
    .afterJSON(function(todos) {
      // we expect all todos in the default
      expect(todos.length).toBe(expectedCount);
      callback(todos);
    }).toss();
};

var checkGetterAndCountContainers = function(user, expectedCount, callback) {
  frisby.create('Check container GET')
    .addHeaders(getHeader(user))
    .get(TEST_URL)
    .expectStatus(200)
    .afterJSON(function(containers) {
      expect(containers.length).toBe(expectedCount);
      callback(containers);
    }).toss();
};

var prepareSetupFor4 = function(user, callback) {

  createManyToDos(user, ['Test1',
    'Test2',
    'Test3', 'Test4', 'Container1', 'Container2',
    'Container3', 'Container4'
  ], function(todos) {

    var todo1 = findTodoBySummary('Test1', todos);
    var todo2 = findTodoBySummary('Test2', todos);
    var todo3 = findTodoBySummary('Test3', todos);
    var todo4 = findTodoBySummary('Test4', todos);
    var cont1 = findTodoBySummary('Container1', todos);
    var cont2 = findTodoBySummary('Container2', todos);
    var cont3 = findTodoBySummary('Container3', todos);
    var cont4 = findTodoBySummary('Container4', todos);

    // convert the todos with the container names into containers
    convertMany(user, [cont1, cont2, cont3, cont4], function(convs) {
      cont1 = findTodoBySummary('Container1', convs);
      cont2 = findTodoBySummary('Container2', convs);
      cont3 = findTodoBySummary('Container3', convs);
      cont4 = findTodoBySummary('Container4', convs);

      addToContainer(user, todo1, cont1, function(todo11) {
        addToContainer(user, todo2, cont2, function(todo21) {
          addToContainer(user, todo3, cont3, function(todo31) {
            addToContainer(user, todo4, cont4, function(todo41) {


              // Default Container should contain all at the moment
              checkGetterAndCountTodo(user, null, 4, function(defaults) {
                expect(findTodoBySummary('Test1', defaults).parents.length).toBe(2);
                expect(findTodoBySummary('Test2', defaults).parents.length).toBe(2);
                expect(findTodoBySummary('Test3', defaults).parents.length).toBe(2);
                expect(findTodoBySummary('Test4', defaults).parents.length).toBe(2);

                callback(todo11, todo21, todo31, todo41, cont1, cont2, cont3, cont4);

              });

            });
          });
        });
      });
    });
  });



};

var registerAndLogin = function(user, passwd, callback) {
  frisby.create('First register container user for all')
    .post(REGISTER_URL, {
      'username': user,
      'password': passwd
    })
    .expectStatus(200)
    .after(function(err, res, body) {

      frisby.create('Login the user for all tests')
        .post(LOGIN_URL, {
          'username': user,
          'password': passwd
        })
        .expectStatus(200)
        .afterJSON(function(jsonLogin) {

          callback(jsonLogin.token);
        }).toss();
    }).toss();
};


describe('Container TestSuite put', function() {
  var user = TEST_USER4;
  registerAndLogin(user, TEST_PASSW, function(token) {
    header4 = {
      'x-access-token': token
    };

    prepareSetupFor4(user, function(t1, t2, t3, t4, c1, c2, c3, c4) {
      // Lets update summary, description, state and parents and colors
      // returned container only reflects summary, descriptoin and colors

      var expectedParents = c1.parents;
      var expectedState = c1.state;
      var expectedSummary = 'Container1 updated';
      var expectedColor = 'blue';
      var expectedDescription = 'Container1 description updated';

      c1.color = expectedColor;
      c1.summary = expectedSummary;
      c1.state = 'deleted';
      c1.parents = [{
        parentId: c2._id
      }];
      c1.description = expectedDescription;

      callPutContainer(user, c1, function(updated) {
        expect(updated.summary).toBe(expectedSummary);
        expect(updated.description).toBe(expectedDescription);
        expect(updated.color).toBe(expectedColor);

        // not changed
        expect(updated.state).toBe(expectedState);
        expect(updated.parents.length).toBe(0);
      });

    });
  });

});



describe('Container TestSuite ', function() {

  registerAndLogin(TEST_USER, TEST_PASSW, function(token) {
    header1 = {
      'x-access-token': token
    };


    /**
     * Converting ToDos and adding them to containers
     */
    prepareSetupFor4(TEST_USER, function(t1, t2, t3, t4, c1, c2, c3, c4) {

      // Now check getters for each container should return 1 at the moment
      checkGetterAndCountTodo(TEST_USER, c1._id, 1, function(found) {
        expect(findTodoBySummary('Test1', found).parents.length).toBe(2);
      });
      checkGetterAndCountTodo(TEST_USER, c2._id, 1, function(found) {
        expect(findTodoBySummary('Test2', found).parents.length).toBe(2);

      });
      checkGetterAndCountTodo(TEST_USER, c3._id, 1, function(found) {
        expect(findTodoBySummary('Test3', found).parents.length).toBe(2);

      });
      checkGetterAndCountTodo(TEST_USER, c4._id, 1, function(found) {
        expect(findTodoBySummary('Test4', found).parents.length).toBe(2);

      });

      // lets move some todos around and check them afterwards
      /**
       * c1 -> t1,t3
       * c2 -> t1,t2,t3
       * c3 -> t3
       * c4 -> t4
       * default -> t1,t2,t3,t4
       */
      addToContainer(TEST_USER, t1, c2, function(updated) {
        expect(updated.parents.length).toBe(3);
        addToContainer(TEST_USER, t3, c1, function(updated) {
          expect(updated.parents.length).toBe(3);
          addToContainer(TEST_USER, t3, c2, function(updated) {
            expect(updated.parents.length).toBe(4);

            checkGetterAndCountTodo(TEST_USER, c1._id, 2, function(found) {
              expect(findTodoBySummary('Test1', found).parents.length).toBe(3);
              expect(findTodoBySummary('Test3', found).parents.length).toBe(4);
            });
            checkGetterAndCountTodo(TEST_USER, c2._id, 3, function(found) {
              expect(findTodoBySummary('Test1', found).parents.length).toBe(3);
              expect(findTodoBySummary('Test2', found).parents.length).toBe(2);
              expect(findTodoBySummary('Test3', found).parents.length).toBe(4);
            });
            checkGetterAndCountTodo(TEST_USER, c3._id, 1, function(found) {
              expect(findTodoBySummary('Test3', found).parents.length).toBe(4);
            });
            checkGetterAndCountTodo(TEST_USER, c4._id, 1, function(found) {
              expect(findTodoBySummary('Test4', found).parents.length).toBe(2);
            });
            checkGetterAndCountTodo(TEST_USER, null, 4, function(found) {
              expect(findTodoBySummary('Test1', found).parents.length).toBe(3);
              expect(findTodoBySummary('Test2', found).parents.length).toBe(2);
              expect(findTodoBySummary('Test3', found).parents.length).toBe(4);
              expect(findTodoBySummary('Test4', found).parents.length).toBe(2);


              // Now lets delete some todos to see if it works
              var user = TEST_USER;
              callDeleteToDo(user, t1, 200, function(json) {
                expect(json.state).toBe('deleted');

                checkGetterAndCountTodo(TEST_USER, c1._id, 1, function(found) {
                  expect(findTodoBySummary('Test3', found).parents.length).toBe(4);
                });
                checkGetterAndCountTodo(TEST_USER, c2._id, 2, function(found) {
                  expect(findTodoBySummary('Test2', found).parents.length).toBe(2);
                  expect(findTodoBySummary('Test3', found).parents.length).toBe(4);
                });
                checkGetterAndCountTodo(TEST_USER, c3._id, 1, function(found) {
                  expect(findTodoBySummary('Test3', found).parents.length).toBe(4);
                });
                checkGetterAndCountTodo(TEST_USER, c4._id, 1, function(found) {
                  expect(findTodoBySummary('Test4', found).parents.length).toBe(2);
                });
                checkGetterAndCountTodo(TEST_USER, null, 3, function(found) {
                  expect(findTodoBySummary('Test2', found).parents.length).toBe(2);
                  expect(findTodoBySummary('Test3', found).parents.length).toBe(4);
                  expect(findTodoBySummary('Test4', found).parents.length).toBe(2);


                  // Lets create some new todos in non default container
                  createToDoWithContainer(TEST_USER, 'TODO IN C3', c3._id, function(response) {
                    checkGetterAndCountTodo(TEST_USER, c3._id, 2, function(found) {
                      expect(findTodoBySummary('Test3', found).parents.length).toBe(4);
                      expect(findTodoBySummary('TODO IN C3', found).parents.length).toBe(1);
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});

describe('ContainerTestSuite2', function() {
  var user = TEST_USER3;
  registerAndLogin(user, TEST_PASSW, function(token) {
    // globalSetup is for ALL following requests

    header3 = {
      'x-access-token': token
    };

    prepareSetupFor4(user, function(t1, t2, t3, t4, c1, c2, c3, c4) {
      // lets move some todos around and check them afterwards
      addToContainer(user, t1, c2, function(updated) {
        expect(updated.parents.length).toBe(3);
        addToContainer(user, t3, c1, function(updated) {
          expect(updated.parents.length).toBe(3);
          addToContainer(user, t3, c2, function(updated) {
            expect(updated.parents.length).toBe(4);
            addToContainer(user, t2, c4, function(updated) {
              expect(updated.parents.length).toBe(3);
              /**
               * c1 -> t1,t3
               * c2 -> t1,t2,t3
               * c3 -> t3
               * c4 -> t4,t2
               * default -> t1,t2,t3,t4
               */

              checkGetterAndCountContainers(user, 5, function(containers) {
                expect(findTodoBySummary('Container1', containers).parents.length).toBe(0);
                expect(findTodoBySummary('Container2', containers).parents.length).toBe(0);
                expect(findTodoBySummary('Container3', containers).parents.length).toBe(0);
                expect(findTodoBySummary('Container4', containers).parents.length).toBe(0);
                expect(findTodoBySummary('Standard', containers).parents.length).toBe(0);

                // Standardcontainer is not allowed to be deleted
                var standard = findTodoBySummary('Standard', containers);

                frisby.create('Test')
                  .addHeaders(getHeader(user))
                  .delete(TEST_URL + '?containerId=' + standard._id + '&cascade=true')

                .expectStatus(400)
                  .afterJSON(function(json) {
                    // Standardcontainer is not deleted we still expect 5
                    checkGetterAndCountContainers(user, 5, function(containers) {
                      standard = findTodoBySummary('Standard', containers);

                      // ok lets delete some containers

                      frisby.create('Delete Test')
                        .addHeaders(getHeader(user))
                        .delete(TEST_URL + '?containerId=' + c1._id + '&cascade=true')
                        .expectStatus(200)
                        .afterJSON(function(json) {

                          // ok we deleted container 1 with a cascade
                          // that means t3 should be removed as well
                          /**
                           * 
                           * c2 -> t2
                           * c3 -> 
                           * c4 -> t4,t2
                           * default -> t2,t4
                           */


                          checkGetterAndCountContainers(user, 4, function(containers) {
                            expect(findTodoBySummary('Container2', containers).parents.length).toBe(0);
                            expect(findTodoBySummary('Container3', containers).parents.length).toBe(0);
                            expect(findTodoBySummary('Container4', containers).parents.length).toBe(0);
                            expect(findTodoBySummary('Standard', containers).parents.length).toBe(0);


                            checkGetterAndCountTodo(user, c1._id, 0, function(found) {

                            });
                            checkGetterAndCountTodo(user, c2._id, 1, function(found) {
                              expect(findTodoBySummary('Test2', found).parents.length).toBe(3);
                            });
                            checkGetterAndCountTodo(user, c3._id, 0, function(found) {

                            });
                            checkGetterAndCountTodo(user, c4._id, 2, function(found) {
                              expect(findTodoBySummary('Test4', found).parents.length).toBe(2);
                              expect(findTodoBySummary('Test2', found).parents.length).toBe(3);
                            });
                            checkGetterAndCountTodo(user, null, 2, function(found) {
                              expect(findTodoBySummary('Test2', found).parents.length).toBe(3);
                              expect(findTodoBySummary('Test4', found).parents.length).toBe(2);
                            });
                          });
                        })
                        .toss();
                    });
                  })
                  .toss();
              });
            });
          });
        });
      });
    });
  });
});

describe('ContainerTestSuite2', function() {
  registerAndLogin(TEST_USER2, TEST_PASSW, function(token) {
    // globalSetup is for ALL following requests

    header2 = {
      'x-access-token': token
    };


    var user = TEST_USER2;

    prepareSetupFor4(user, function(t1, t2, t3, t4, c1, c2, c3, c4) {
      // lets move some todos around and check them afterwards
      addToContainer(user, t1, c2, function(updated) {
        expect(updated.parents.length).toBe(3);
        addToContainer(user, t3, c1, function(updated) {
          expect(updated.parents.length).toBe(3);
          addToContainer(user, t3, c2, function(updated) {
            expect(updated.parents.length).toBe(4);
            addToContainer(user, t2, c4, function(updated) {
              expect(updated.parents.length).toBe(3);

              /**
               * c1 -> t1,t3
               * c2 -> t1,t2,t3
               * c3 -> t3
               * c4 -> t4,t2
               * default -> t1,t2,t3,t4
               */
              removeFromContainer(user, t3, c3, function(updated) {
                expect(updated.parents.length).toBe(3);

                /**
                 * c1 -> t1,t3
                 * c2 -> t1,t2,t3
                 * c3 -> 
                 * c4 -> t4,t2
                 * default -> t1,t2,t3,t4
                 */
                // removing one element from a container that does not contain the element
                // does no harm
                removeFromContainer(user, t3, c3, function(updated) {
                  expect(updated.parents.length).toBe(3);
                  /**
                   * c1 -> t1,t3
                   * c2 -> t1,t2,t3
                   * c3 -> 
                   * c4 -> t4,t2
                   * default -> t1,t2,t3,t4
                   */
                  removeFromContainer(user, t2, c2, function(updated) {
                    expect(updated.parents.length).toBe(2);
                    /**
                     * c1 -> t1,t3
                     * c2 -> t1,t3
                     * c3 -> 
                     * c4 -> t4,t2
                     * default -> t1,t2,t3,t4
                     */
                    removeFromContainer(user, t1, c1, function(updated) {
                      expect(updated.parents.length).toBe(2);
                      /**
                       * c1 -> t3
                       * c2 -> t1,t3
                       * c3 -> 
                       * c4 -> t4,t2
                       * default -> t1,t2,t3,t4
                       */

                      removeFromContainer(user, t1, c2, function(updated) {
                        expect(updated.parents.length).toBe(1);
                        /**
                         * c1 -> t3
                         * c2 -> t3
                         * c3 -> 
                         * c4 -> t4,t2
                         * default -> t1,t2,t3,t4
                         */

                        // Now removing t1 from the standard container is not allowed to work
                        // because it is the only container t1 is contained in
                        var fakeDefaultContainer = {
                          _id: t1.parents[0].parentId
                        };
                        removeFromContainer(user, t1, fakeDefaultContainer, function(updated) {
                          expect(updated.parents.length).toBe(1);
                          /**
                           * c1 -> t3
                           * c2 -> t3
                           * c3 -> 
                           * c4 -> t4,t2
                           * default -> t1,t2,t3,t4
                           */

                          // removing t2 from standard container is allowed because it is
                          // contained in c4

                          removeFromContainer(user, t4, fakeDefaultContainer, function(updated) {
                            expect(updated.parents.length).toBe(1);
                            /**
                             * c1 -> t3
                             * c2 -> t3
                             * c3 -> 
                             * c4 -> t4,t2
                             * default -> t1,t2,t3,
                             */

                            // removing t2 from c4 is allowed but the returned todo is contained
                            // in the standard container again
                            removeFromContainer(user, t4, c4, function(updated) {
                              expect(updated.parents.length).toBe(1);
                              /**
                               * c1 -> t3
                               * c2 -> t3
                               * c3 -> 
                               * c4 -> t2
                               * default -> t4, t1,t2,t3,
                               */

                              // removing t3 from stabdard container and have the final check for
                              // the containers as well.
                              removeFromContainer(user, t3, fakeDefaultContainer, function(updated) {
                                expect(updated.parents.length).toBe(2);
                                /**
                                 * c1 -> t3
                                 * c2 -> t3
                                 * c3 -> 
                                 * c4 -> t2
                                 * default -> t4, t1,t2
                                 */



                                checkGetterAndCountTodo(user, c1._id, 1, function(found) {
                                  expect(findTodoBySummary('Test3', found).parents.length).toBe(2);
                                });
                                checkGetterAndCountTodo(user, c2._id, 1, function(found) {
                                  expect(findTodoBySummary('Test3', found).parents.length).toBe(2);
                                });
                                checkGetterAndCountTodo(user, c3._id, 0, function(found) {
                                  expect(found.length).toBe(0);
                                });
                                checkGetterAndCountTodo(user, c4._id, 1, function(found) {
                                  expect(findTodoBySummary('Test2', found).parents.length).toBe(2);
                                });
                                checkGetterAndCountTodo(user, null, 3, function(found) {
                                  expect(findTodoBySummary('Test1', found).parents.length).toBe(1);
                                  expect(findTodoBySummary('Test2', found).parents.length).toBe(2);
                                  expect(findTodoBySummary('Test4', found).parents.length).toBe(1);
                                });


                              });
                            });
                          });

                        });
                      });
                    });
                  });

                });
              });

            });
          });
        });

      });
    });
  });
});