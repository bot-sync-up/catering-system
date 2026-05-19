package co.il.catering

import co.il.catering.domain.repository.TaskRepository
import co.il.catering.domain.usecase.MarkTaskDoneUseCase
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

class MarkTaskDoneUseCaseTest {

    @Test
    fun `delegates to repository`() = runTest {
        val repo = mockk<TaskRepository>()
        coEvery { repo.markDone("t1") } returns Result.success(Unit)
        val useCase = MarkTaskDoneUseCase(repo)
        val result = useCase("t1")
        assertTrue(result.isSuccess)
        coVerify { repo.markDone("t1") }
    }
}
